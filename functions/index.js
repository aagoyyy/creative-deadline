
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

initializeApp();

const auth = getAuth();
const db = getFirestore();
const REGION = "asia-southeast2";

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Silakan login terlebih dahulu.");
  }

  const snap = await db.collection("users").doc(request.auth.uid).get();

  if (
    !snap.exists ||
    snap.data().active !== true ||
    snap.data().role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Hanya admin aktif yang boleh mengelola anggota."
    );
  }

  return request.auth.uid;
}

exports.createTeamMember = onCall({ region: REGION }, async (request) => {
  await requireAdmin(request);

  const name = String(request.data?.name || "").trim();
  const email = String(request.data?.email || "").trim().toLowerCase();
  const password = String(request.data?.password || "");
  const role = String(request.data?.role || "").toLowerCase();

  if (!name || name.length > 100) {
    throw new HttpsError("invalid-argument", "Nama wajib diisi.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Email tidak valid.");
  }

  if (password.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Password awal minimal 6 karakter."
    );
  }

  if (!["creative", "strategic", "admin"].includes(role)) {
    throw new HttpsError("invalid-argument", "Role tidak valid.");
  }

  let newUser;

  try {
    newUser = await auth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });

    await db.collection("users").doc(newUser.uid).set({
      name,
      email,
      role,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uid: newUser.uid, name, email, role, active: true };
  } catch (error) {
    if (newUser) {
      try {
        await auth.deleteUser(newUser.uid);
      } catch (cleanupError) {
        console.error("Cleanup gagal:", cleanupError);
      }
    }

    if (error instanceof HttpsError) throw error;

    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Email sudah digunakan.");
    }

    console.error(error);
    throw new HttpsError("internal", "Gagal membuat anggota.");
  }
});

exports.setTeamMemberActive = onCall({ region: REGION }, async (request) => {
  const callerUid = await requireAdmin(request);
  const uid = String(request.data?.uid || "").trim();
  const active = request.data?.active;

  if (!uid || typeof active !== "boolean") {
    throw new HttpsError("invalid-argument", "Data anggota tidak valid.");
  }

  if (uid === callerUid && !active) {
    throw new HttpsError("failed-precondition", "Tidak bisa menonaktifkan diri sendiri.");
  }

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Anggota tidak ditemukan.");
  }

  const member = snap.data();

  if (!active && member.role === "admin" && member.active === true) {
    const admins = await db.collection("users")
      .where("role", "==", "admin")
      .where("active", "==", true)
      .get();

    if (admins.size <= 1) {
      throw new HttpsError("failed-precondition", "Admin aktif terakhir tidak bisa dinonaktifkan.");
    }
  }

  try {
    await auth.updateUser(uid, { disabled: !active });
    await ref.update({
      active,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { uid, active };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(error);
    throw new HttpsError("internal", "Gagal mengubah status anggota.");
  }
});

exports.deleteTeamMember = onCall({ region: REGION }, async (request) => {
  const callerUid = await requireAdmin(request);
  const uid = String(request.data?.uid || "").trim();

  if (!uid) {
    throw new HttpsError("invalid-argument", "UID anggota wajib diisi.");
  }

  if (uid === callerUid) {
    throw new HttpsError("failed-precondition", "Tidak bisa menghapus akun sendiri.");
  }

  const ref = db.collection("users").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Anggota tidak ditemukan.");
  }

  const member = snap.data();

  if (member.role === "admin" && member.active === true) {
    const admins = await db.collection("users")
      .where("role", "==", "admin")
      .where("active", "==", true)
      .get();

    if (admins.size <= 1) {
      throw new HttpsError("failed-precondition", "Admin aktif terakhir tidak bisa dihapus.");
    }
  }

  try {
    try {
      await auth.deleteUser(uid);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }

    await ref.delete();
    return { uid, deleted: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(error);
    throw new HttpsError("internal", "Gagal menghapus anggota.");
  }
});
