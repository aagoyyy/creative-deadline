
import { useEffect, useState } from 'react'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  deleteUser,
} from 'firebase/auth'
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
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

export default function Team({ currentUser }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
        console.error('Gagal mengambil data tim:', err)
        setError('Gagal memuat anggota. Periksa Firestore Rules.')
        setLoading(false)
      }
    )

    return unsubscribe
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

  function closeModal() {
    if (saving) return

    setShowModal(false)
    setFormError('')
    setShowPassword(false)
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
      setFormError('Semua kolom wajib diisi.')
      return
    }

    if (password.length < 6) {
      setFormError('Password minimal 6 karakter.')
      return
    }

    setSaving(true)
    setFormError('')
    setNotice('')

    let secondaryAuth
    let secondaryApp
    let newUser

    try {
      // Buat Firebase app terpisah agar sesi admin tidak terganti.
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

      // Firestore menggunakan sesi admin dari app utama.
      await setDoc(doc(db, 'users', newUser.uid), {
        name,
        email,
        role: form.role,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
      })

      setNotice(`Anggota ${name} berhasil ditambahkan.`)
      setShowModal(false)
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'creative',
      })
    } catch (err) {
      console.error('Gagal menambahkan anggota:', err)

      // Jika Auth berhasil tetapi profil gagal dibuat,
      // coba hapus akun baru yang baru saja dibuat.
      if (newUser && secondaryAuth?.currentUser) {
        try {
          await deleteUser(secondaryAuth.currentUser)
        } catch (cleanupError) {
          console.error(
            'Pembersihan akun baru gagal:',
            cleanupError
          )
        }
      }

      const messages = {
        'auth/email-already-in-use':
          'Email ini sudah terdaftar di Firebase Authentication.',
        'auth/invalid-email':
          'Format email tidak valid.',
        'auth/weak-password':
          'Password terlalu lemah. Gunakan minimal 6 karakter.',
        'auth/operation-not-allowed':
          'Metode Email/Password belum aktif di Firebase Authentication.',
        'permission-denied':
          'Firestore menolak penyimpanan profil. Periksa Rules dan pastikan akun lu admin aktif.',
      }

      setFormError(
        messages[err.code] ||
          err.message ||
          'Gagal menambahkan anggota.'
      )
    } finally {
      if (secondaryAuth) {
        try {
          await signOut(secondaryAuth)
        } catch (signOutError) {
          console.error(
            'Gagal menutup sesi sekunder:',
            signOutError
          )
        }

        try {
            await deleteApp(secondaryApp)
        } catch (deleteAppError) {
          console.error(
            'Gagal menutup Firebase app sekunder:',
            deleteAppError
          )
        }
      }

      setSaving(false)
    }
  }

  async function handleToggleMember(member) {
    if (!isAdmin || processingUid) return

    if (member.uid === currentUser?.uid) {
      setNotice('Lu tidak bisa menonaktifkan akun sendiri.')
      return
    }

    const currentlyActive = member.active === true
    const nextActive = !currentlyActive

    const confirmed = window.confirm(
      `Yakin ingin ${
        nextActive ? 'mengaktifkan' : 'menonaktifkan'
      } ${member.name || member.email || 'anggota ini'}?`
    )

    if (!confirmed) return

    setProcessingUid(member.uid)
    setNotice('')
    setError('')

    try {
      await updateDoc(doc(db, 'users', member.uid), {
        active: nextActive,
      })

      setNotice(
        `${member.name || 'Anggota'} berhasil ${
          nextActive ? 'diaktifkan' : 'dinonaktifkan'
        }.`
      )
    } catch (err) {
      console.error('Gagal mengubah status anggota:', err)
      setError(
        'Gagal mengubah status. Pastikan Firestore Rules sudah dipublikasikan dan akun lu admin aktif.'
      )
    } finally {
      setProcessingUid('')
    }
  }

  return (
    <section className="team-page">
      <header className="team-header">
        <div>
          <span className="team-eyebrow">WORKSPACE SETTINGS</span>
          <h1>Team Management</h1>
          <p>Kelola anggota dan akses tim kreatif.</p>
        </div>

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
            Tambah Anggota
          </button>
        )}
      </header>

      {notice && (
        <div className="team-notice" role="status">
          {notice}
        </div>
      )}

      <div className="team-stats">
        <article className="team-stat-card">
          <div className="team-stat-icon">
            <UsersRound size={21} />
          </div>
          <div>
            <span>Total Anggota</span>
            <strong>{members.length}</strong>
          </div>
        </article>

        <article className="team-stat-card">
          <div className="team-stat-icon team-icon-active">
            <ShieldCheck size={21} />
          </div>
          <div>
            <span>Anggota Aktif</span>
            <strong>{activeCount}</strong>
          </div>
        </article>
      </div>

      <section className="team-panel">
        <div className="team-panel-header">
          <div>
            <h2>Daftar Anggota</h2>
            <p>Data anggota yang terdaftar di sistem.</p>
          </div>

          <label className="team-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari anggota..."
            />
          </label>
        </div>

        {loading ? (
          <div className="team-empty">
            <LoaderCircle className="team-spinner" size={25} />
            <span>Memuat anggota...</span>
          </div>
        ) : error ? (
          <div className="team-empty team-error">{error}</div>
        ) : filteredMembers.length === 0 ? (
          <div className="team-empty">
            {search
              ? 'Anggota tidak ditemukan.'
              : 'Belum ada profil anggota di Firestore.'}
          </div>
        ) : (
          <div className="team-table-scroll">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Anggota</th>
                  <th>Role</th>
                  <th>Status</th>
                  {isAdmin && <th>Aksi</th>}
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
                              {member.name || 'Tanpa nama'}
                            </strong>
                            <span>
                              <Mail size={13} />
                              {member.email || 'Email belum tersedia'}
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
                          {active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>

                      {isAdmin && (
                        <td>
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
                                ? 'Tidak bisa mengubah status akun sendiri'
                                : active
                                  ? 'Nonaktifkan anggota'
                                  : 'Aktifkan anggota'
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
                                ? 'Memproses...'
                                : active
                                  ? 'Nonaktifkan'
                                  : 'Aktifkan'}
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
        Penonaktifan mengubah akses aplikasi melalui profil Firestore.
        Penghapusan akun Firebase Authentication tetap dilakukan
        melalui Firebase Console.
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
                <h2 id="team-modal-title">Tambah Anggota</h2>
                <p>Buat akun baru untuk tim kreatif.</p>
              </div>

              <button
                type="button"
                className="team-modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Tutup form"
              >
                <X size={20} />
              </button>
            </header>

            <form className="team-form" onSubmit={handleAddMember}>
              <label>
                Nama lengkap
                <input
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder="Contoh: Budi Santoso"
                  autoComplete="name"
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateForm}
                  placeholder="nama@perusahaan.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Password awal
                <div className="team-password-field">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={updateForm}
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? 'Sembunyikan password' : 'Lihat password'
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

              <label>
                Role anggota
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

              {formError && (
                <div className="team-form-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="team-form-note">
                Akun baru akan langsung aktif. Simpan password awal
                dengan aman dan sampaikan kepada anggota tersebut
                melalui jalur pribadi.
              </div>

              <footer className="team-form-actions">
                <button
                  type="button"
                  className="team-cancel-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Batal
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
                      Membuat akun...
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      Simpan Anggota
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
