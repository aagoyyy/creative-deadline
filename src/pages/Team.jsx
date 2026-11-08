
import { useEffect, useState } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  reload,
} from 'firebase/auth'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  UsersRound,
  UserPlus,
  Search,
  Mail,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  LoaderCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'

import { auth, db } from '../firebase'
import './Team.css'

export default function Team({ currentUser, onRequestConfirm }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [processingUid, setProcessingUid] = useState('')
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'creative',
  })

  const isAdmin = currentUser?.role === 'admin'

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setMembers(
          snapshot.docs.map((item) => ({
            uid: item.id,
            ...item.data(),
          }))
        )
        setError('')
        setLoading(false)
      },
      (err) => {
        console.error('Failed to fetch team members:', err)
        setError('Failed to load team members. Check your Firestore Rules.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  // After a user verifies an email-change link, sync the verified Auth email
  // into their Firestore profile the next time they open Team Management.
  useEffect(() => {
    let cancelled = false

    async function syncVerifiedEmail() {
      const signedInUser = auth.currentUser
      if (!signedInUser) return

      try {
        await reload(signedInUser)
        if (cancelled || !signedInUser.email) return

        const profileRef = doc(db, 'users', signedInUser.uid)
        const profileSnap = await getDoc(profileRef)

        if (
          !cancelled &&
          profileSnap.exists() &&
          profileSnap.data().email !== signedInUser.email
        ) {
          await updateDoc(profileRef, {
            email: signedInUser.email,
            updatedAt: serverTimestamp(),
          })
        }
      } catch (syncError) {
        console.error('Failed to sync verified email:', syncError)
      }
    }

    syncVerifiedEmail()
    return () => {
      cancelled = true
    }
  }, [])

  const activeCount = members.filter(
    (member) => member.active === true
  ).length

  const filteredMembers = members.filter((member) => {
    const keyword = search.trim().toLowerCase()

    return [member.name, member.email, member.role].some(
      (value) =>
        String(value || '').toLowerCase().includes(keyword)
    )
  })

  function updateForm(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  function openEditModal(member) {
    setEditingMember(member)
    setFormError('')
    setNotice('')
    setShowPassword(false)
    setCurrentPassword('')
    setNewEmail(member.email || '')
    setNewPassword('')
    setForm({
      name: member.name || '',
      email: member.email || '',
      password: '',
      role: member.role || 'creative',
    })
    setShowModal(true)
  }

  function closeModal() {
    if (saving) return

    setShowModal(false)
    setEditingMember(null)
    setFormError('')
    setShowPassword(false)
    setCurrentPassword('')
    setNewEmail('')
    setNewPassword('')
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'creative',
    })
  }

  async function handleAddMember(event) {
    event.preventDefault()

    if (!isAdmin) return

    const name = form.name.trim()
    const email = form.email.trim().toLowerCase()
    const password = form.password

    if (!name || !email || !password) {
      setFormError('All fields are required.')
      return
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters long.')
      return
    }

    setSaving(true)
    setFormError('')
    setNotice('')

    let secondaryAuth
    let secondaryApp
    let newUser

    try {
      // Create a separate Firebase app so the admin session remains active.
      const secondaryName = `TeamCreation-${Date.now()}`
      secondaryApp = initializeApp(
        auth.app.options,
        secondaryName
      )

      secondaryAuth = getAuth(secondaryApp)

      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      )

      newUser = credential.user

      await updateProfile(newUser, { displayName: name })

      // Firestore uses the admin session from the primary app.
      await setDoc(doc(db, 'users', newUser.uid), {
        name,
        email,
        role: form.role,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      })

      setNotice(`${name} has been added successfully.`)
      setShowModal(false)
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'creative',
      })
    } catch (err) {
      console.error('Failed to add team member:', err)

      // If authentication succeeds but profile creation fails,
      // try to delete the newly created account.
      if (newUser && secondaryAuth?.currentUser) {
        try {
          await deleteUser(secondaryAuth.currentUser)
        } catch (cleanupError) {
          console.error(
            'Failed to clean up the new account:',
            cleanupError
          )
        }
      }

      const messages = {
        'auth/email-already-in-use':
          'This email is already registered in Firebase Authentication.',
        'auth/invalid-email':
          'Invalid email format.',
        'auth/weak-password':
          'Password is too weak. Use at least 6 characters.',
        'auth/operation-not-allowed':
          'Email/Password sign-in is not enabled in Firebase Authentication.',
        'permission-denied':
          'Firestore rejected the profile creation. Check your Rules and make sure your account is an active admin.',
      }

      setFormError(
        messages[err.code] ||
          err.message ||
          'Failed to add team member.'
      )
    } finally {
      if (secondaryAuth) {
        try {
          await signOut(secondaryAuth)
        } catch (signOutError) {
          console.error(
            'Failed to sign out from the secondary session:',
            signOutError
          )
        }

        try {
          await deleteApp(secondaryApp)
        } catch (deleteAppError) {
          console.error(
            'Failed to close the secondary Firebase app:',
            deleteAppError
          )
        }
      }

      setSaving(false)
    }
  }

  async function handleEditMember(event) {
    event.preventDefault()
    if (!editingMember) return

    const isSelf = editingMember.uid === auth.currentUser?.uid
    if (!isAdmin && !isSelf) return

    const name = form.name.trim()
    const role = form.role
    const requestedEmail = newEmail.trim().toLowerCase()
    const emailChanged = isSelf && requestedEmail !== String(auth.currentUser?.email || '').toLowerCase()
    const passwordChanged = isSelf && Boolean(newPassword)

    if (isAdmin && !name) {
      setFormError('Name is required.')
      return
    }

    if (isAdmin && isSelf && role !== 'admin') {
      setFormError('You cannot change your own admin role.')
      return
    }

    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
      setFormError('Please enter a valid email address.')
      return
    }

    if (passwordChanged && newPassword.length < 6) {
      setFormError('New password must be at least 6 characters long.')
      return
    }

    if ((emailChanged || passwordChanged) && !currentPassword) {
      setFormError('Enter your current password to verify your identity.')
      return
    }

    setSaving(true)
    setFormError('')
    setNotice('')

    try {
      if (isSelf && auth.currentUser) {
        const signedInUser = auth.currentUser

        if (emailChanged || passwordChanged) {
          const credential = EmailAuthProvider.credential(
            signedInUser.email,
            currentPassword
          )
          await reauthenticateWithCredential(signedInUser, credential)
        }

        if (emailChanged) {
          await verifyBeforeUpdateEmail(signedInUser, requestedEmail)
        }

        if (passwordChanged) {
          await updatePassword(signedInUser, newPassword)
        }
      }

      // Only admins can edit profile names and roles.
      if (isAdmin) {
        await updateDoc(doc(db, 'users', editingMember.uid), {
          name,
          role,
          updatedAt: serverTimestamp(),
        })
      }

      const messages = []
      if (isAdmin) {
        messages.push(`${name}'s profile has been updated.`)
      }
      if (emailChanged) {
        messages.push(`A verification link has been sent to ${requestedEmail}.`)
      }
      if (passwordChanged) {
        messages.push('Your password has been changed.')
      }

      setNotice(messages.join(' '))
      setShowModal(false)
      setEditingMember(null)
      setCurrentPassword('')
      setNewEmail('')
      setNewPassword('')
    } catch (err) {
      console.error('Failed to edit team member:', err)

      const messages = {
        'auth/wrong-password': 'Current password is incorrect.',
        'auth/invalid-credential': 'Current password is incorrect. Please try again.',
        'auth/requires-recent-login': 'Please sign in again before changing account security details.',
        'auth/email-already-in-use': 'That email address is already in use.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'New password is too weak. Use at least 6 characters.',
        'permission-denied': 'You do not have permission to edit this profile. Check your Firestore Rules.',
      }

      setFormError(
        messages[err.code] || err.message || 'Failed to update team member.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMember(member) {
    if (!isAdmin || processingUid) return

    if (member.uid === currentUser?.uid) {
      setNotice('You cannot deactivate your own account.')
      return
    }

    const currentlyActive = member.active === true
    const nextActive = !currentlyActive

    onRequestConfirm?.({
      title: nextActive
        ? 'Activate Team Member?'
        : 'Deactivate Team Member?',
      message: `Are you sure you want to ${
        nextActive ? 'activate' : 'deactivate'
      } ${member.name || member.email || 'this team member'}?`,
      confirmText: nextActive ? 'Yes, Activate' : 'Yes, Deactivate',
      onConfirm: async () => {
        setProcessingUid(member.uid)
        setNotice('')
        setError('')

        try {
          await updateDoc(doc(db, 'users', member.uid), {
            active: nextActive,
          })

          setNotice(
            `${member.name || 'Team member'} has been ${
              nextActive ? 'activated' : 'deactivated'
            } successfully.`
          )
        } catch (err) {
          console.error('Failed to update team member status:', err)
          setError(
            'Failed to update status. Make sure your Firestore Rules are published and your account is an active admin.'
          )
        } finally {
          setProcessingUid('')
        }
      },
    })
  }

  return (
    <section className="team-page">
      <header className="team-header">
        {currentUser?.uid && (
          <button
            type="button"
            className="team-account-button"
            onClick={() => {
              const ownMember = members.find(
                (member) => member.uid === currentUser.uid
              ) || {
                uid: currentUser.uid,
                name: currentUser.name || '',
                email: currentUser.email || auth.currentUser?.email || '',
                role: currentUser.role || 'creative',
              }
              openEditModal(ownMember)
            }}
          >
            <ShieldCheck size={17} />
            My Account
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className="team-add-button"
            onClick={() => {
              setFormError('')
              setNotice('')
              setShowModal(true)
            }}
          >
            <UserPlus size={17} />
            Add Team Member
          </button>
        )}
      </header>

      {notice && (
        <div className="team-form-note" role="status">
          {notice}
        </div>
      )}

      <div className="team-stats">
        <article className="team-stat-card">
          <div className="team-stat-icon">
            <UsersRound size={21} />
          </div>
          <div>
            <span>Total Members</span>
            <strong>{members.length}</strong>
          </div>
        </article>

        <article className="team-stat-card">
          <div className="team-stat-icon team-icon-active">
            <ShieldCheck size={21} />
          </div>
          <div>
            <span>Active Members</span>
            <strong>{activeCount}</strong>
          </div>
        </article>
      </div>

      <section className="team-panel">
        <div className="team-panel-header">
          <div>
            <h2>Team Members</h2>
            <p>All members registered in the system.</p>
          </div>

          <label className="team-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search team members..."
            />
          </label>
        </div>

        {loading ? (
          <div className="team-empty">
            <LoaderCircle className="team-spinner" size={25} />
            <span>Loading team members...</span>
          </div>
        ) : error ? (
          <div className="team-empty team-error">{error}</div>
        ) : filteredMembers.length === 0 ? (
          <div className="team-empty">
            {search
              ? 'No team members found.'
              : 'No team member profiles found in Firestore.'}
          </div>
        ) : (
          <div className="team-table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>

              <tbody>
                {filteredMembers.map((member) => {
                  const active = member.active === true
                  const role = String(
                    member.role || 'unknown'
                  ).toLowerCase()

                  return (
                    <tr key={member.uid}>
                      <td>
                        <div className="team-member">
                          <div className="team-avatar">
                            {String(
                              member.name || member.email || '?'
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="team-member-copy">
                            <strong>
                              {member.name || 'Unnamed Member'}
                            </strong>
                            <span>
                              <Mail size={13} />
                              {member.email || 'Email unavailable'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`team-role role-${role}`}>
                          {role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`team-status ${
                            active
                              ? 'status-active'
                              : 'status-inactive'
                          }`}
                        >
                          <i />
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {isAdmin && (
                        <td>
                          <button
                            type="button"
                            className="team-edit-button"
                            onClick={() => openEditModal(member)}
                            disabled={Boolean(processingUid)}
                            title="Edit team member"
                          >
                            <UserPlus size={17} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="team-toggle-button"
                            onClick={() => handleToggleMember(member)}
                            disabled={
                              member.uid === currentUser?.uid ||
                              processingUid === member.uid
                            }
                            title={
                              member.uid === currentUser?.uid
                                ? 'You cannot change your own account status'
                                : active
                                  ? 'Deactivate team member'
                                  : 'Activate team member'
                            }
                          >
                            {processingUid === member.uid ? (
                              <LoaderCircle
                                className="team-spinner"
                                size={19}
                              />
                            ) : active ? (
                              <ToggleRight size={21} />
                            ) : (
                              <ToggleLeft size={21} />
                            )}

                            <span>
                              {processingUid === member.uid
                                ? 'Processing...'
                                : active
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </span>
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="team-footnote">
        Admins can edit member names and roles. Each member manages their own
        email and password changes using account verification.
      </p>

      {showModal && (
        <div
          className="team-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal()
          }}
        >
          <section
            className="team-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-modal-title"
          >
            <header className="team-modal-header">
              <div>
                <span className="team-eyebrow">TEAM MANAGEMENT</span>
                <h2 id="team-modal-title">
                  {editingMember ? 'Edit Team Member' : 'Add Team Member'}
                </h2>
                <p>
                  {editingMember
                    ? 'Update member details and account settings.'
                    : 'Create a new account for your team.'}
                </p>
              </div>

              <button
                type="button"
                className="team-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </header>

            <form
              className="team-form"
              onSubmit={editingMember ? handleEditMember : handleAddMember}
            >
              {isAdmin && (
                <label>
                  Full Name
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateForm}
                    placeholder="e.g. John Smith"
                    autoComplete="name"
                    required
                  />
                </label>
              )}

              {isAdmin && (
                <label>
                  Email Address
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={updateForm}
                    placeholder="name@company.com"
                    autoComplete="email"
                    readOnly={Boolean(editingMember)}
                    required
                  />
                </label>
              )}

              {editingMember && editingMember.uid !== auth.currentUser?.uid && (
                <div className="team-form-note">
                  Email and password are managed by the account owner through
                  their own verified account settings.
                </div>
              )}

              {!editingMember && (
                <label>
                  Initial Password
                  <div className="team-password-field">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={updateForm}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>
              )}

              {editingMember && editingMember.uid === auth.currentUser?.uid && (
                <>
                  <div className="team-form-note">
                    Email and password changes apply only to your own account.
                    Email changes require opening a verification link sent to
                    the new address.
                  </div>

                  <label>
                    New Email Address
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(event) => setNewEmail(event.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                    />
                  </label>

                  <label>
                    Current Password
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="Enter current password to verify"
                      autoComplete="current-password"
                    />
                  </label>

                  <label>
                    New Password
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Leave blank to keep current password"
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </label>
                </>
              )}

              {isAdmin && (
                <label>
                  Member Role
                  <select
                    name="role"
                    value={form.role}
                    onChange={updateForm}
                    required
                  >
                    <option value="creative">Creative</option>
                    <option value="strategic">Strategic</option>
                    <option value="admin">Admin</option>
                    <option value="digital_marketing">Digital Marketing</option>
                  </select>
                </label>
              )}

              {formError && (
                <div className="team-form-error" role="alert">
                  {formError}
                </div>
              )}

              {!editingMember && (
                <div className="team-form-note">
                  The new account will be activated immediately. Store the
                  initial password securely and share it with the team member
                  privately.
                </div>
              )}

              <footer className="team-form-actions">
                <button
                  type="button"
                  className="team-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="team-submit-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="team-spinner"
                      />
                      {editingMember ? 'Saving Changes...' : 'Creating Account...'}
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      {editingMember ? 'Save Changes' : 'Save Member'}
                    </>
                  )}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
