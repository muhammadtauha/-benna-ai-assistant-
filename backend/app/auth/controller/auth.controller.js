// Minimal auth endpoints matching the frontend contract:
//   POST /api/users/auth/registration  { name, email, phone, password }
//   POST /api/users/auth/customer/login { email, password, deviceType, origin }
// Both return the same envelope: { success, message, data: { token, userDetail } }
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Auth = require("../model/auth.model");
const UserCredits = require("../../user/model/userCredits.model");

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = process.env.JWT_TTL || "30d";

const userDetailOf = (u) => ({
  _id: u._id,
  id: String(u._id),
  email: u.email,
  name: u.name,
  phone: u.phone,
  roleId: u.roleId,
});

const sign = (u) =>
  jwt.sign({ userId: String(u._id), roleId: u.roleId }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });

const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }
    const exists = await Auth.findOne({ email: String(email).toLowerCase() }).lean();
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: "An account with this email already exists" });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await Auth.create({
      name: name || "User",
      email: String(email).toLowerCase(),
      phone: phone || "",
      password: hash,
    });
    // Mirror Benna: new customers start with the free credit balance.
    await UserCredits.create({ customerId: String(user._id) }).catch(() => {});
    return res.json({
      success: true,
      message: "Registration successful",
      data: { token: sign(user), userDetail: userDetailOf(user) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const user = await Auth.findOne({ email: String(email || "").toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password || ""), user.password))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or password" });
    }
    return res.json({
      success: true,
      data: { token: sign(user), userDetail: userDetailOf(user) },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const me = async (req, res) => {
  return res.json({ success: true, data: { userDetail: userDetailOf(req.user) } });
};

module.exports = { register, login, me };
