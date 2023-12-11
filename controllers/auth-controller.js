import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import { HttpError, sendEmail } from "../helpers/index.js";
import { userSignupSchema, userSigninSchema } from "../models/User.js";
import gravatar from "gravatar";
import path from "path";
import fs from "fs/promises";
import jimp from "jimp";
import { nanoid } from "nanoid";
dotenv.config();

const avatarsPath = path.resolve("public", "avatars");

const { JWT_SECRET } = process.env;
const { BASE_URL } = process.env;

const signup = async (req, res, next) => {
  try {
    const { error } = userSignupSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    const avatarURL = gravatar.url(email);
    if (user) {
      throw HttpError(409, "Email in use");
    }
    const hashPassword = await bcrypt.hash(password, 10);

    const verificationToken = nanoid();

    const newUser = await User.create({
      ...req.body,
      password: hashPassword,
      verificationToken,
      avatarURL,
    });

    const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${verificationToken}">Click verify email</a>`,
    };
    await sendEmail(verifyEmail);

    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const verify = async (req, res, next) => {
  try {
    const { verificationToken } = req.params;

    const user = await User.findOne({ verificationToken });

    if (!user) {
      throw HttpError(404, "User not found");
    }

    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: "",
    });

    res.json({
      message: "Verification successful",
    });
  } catch (error) {
    next(error);
  }
};

const resendVerify = async (req, res, next) => {
  try {
    const { error } = userEmailSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(404, "User not found");
    }

    if (user.verify) {
      throw HttpError(400, "Verification has already been passed");
    }

    const verifyEmail = {
      to: email,
      subject: "Сonfirm your registration",
      html: `<a target="_blank" href="${BASE_URL}/users/verify/${user.verificationToken}">Click to confirm your registration</a>`,
    };

    await sendEmail(verifyEmail);

    res.json({
      message: "Verification email sent",
    });
  } catch (error) {
    next(error);
  }
};

const signin = async (req, res, next) => {
  try {
    const { error } = userSigninSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(401, "Email or password is wrong");
    }

    if (!user.verify) {
      throw HttpError(401, "User not found");
    }

    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw HttpError(401, "Email or password is wrong");
    }
    const payload = {
      id: user._id,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "23h" });

    await User.findByIdAndUpdate(user._id, { token });

    res.status(200).json({
      token,
      user: {
        email,
        subscription: user.subscription,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getCurrent = async (req, res) => {
  const { email, subscription } = req.user;

  res.status(200).json({
    email,
    subscription,
  });
};
const signout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.status(204).json({});
};

const updateAvatar = async (req, res, next) => {
  try {
    const { _id } = req.user;
    const { path: oldPath, filename } = req.file;
    const newPath = path.join(avatarsPath, filename);
    (await jimp.read(oldPath)).resize(250, 250).write(oldPath);
    await fs.rename(oldPath, newPath);
    const avatarURL = path.join("avatars", filename);
    await User.findByIdAndUpdate(_id, { avatarURL });
    res.status(200).json({ avatarURL });
  } catch (error) {
    next(error);
  }
};
export default {
  signup,
  signin,
  getCurrent,
  signout,
  updateAvatar,
  verify,
  resendVerify,
};
// const addContact = async (req, res, next) => {
//   try {
//     const { error } = contactAddSchema.validate(req.body);
//     if (error) {
//       throw HttpError(400, error.message);
//     }
//     const { _id: owner } = req.user;
//     const { path: oldPath, filename } = req.file;
//     const newPath = path.join(avatarsPath, filename);
//     await fs.rename(oldPath, newPath);
//     const avatar = path.join("avatars", filename);
//     const result = await Contact.create({ ...req.body, avatar, owner });
//     res.status(201).json(result);
//   } catch (error) {
//     next(error);
//   }
// };

// const updateAvatar = async (req, res, next) => {
//   try {
//     const { error } = contactFavoriteSchema.validate(req.body);
//     if (error) {
//       throw HttpError(400, error.message);
//     }
//     const { id } = req.params;
//     const { _id: owner } = req.user;
//     const result = await Contact.findOneAndUpdate({ _id: id, owner }, req.body);
//     if (!result) {
//       throw HttpError(404, `Not found`);
//     }
//     res.json(result);
//   } catch (error) {
//     next(error);
//   }
// };
// const ctrlContactWrapper = (ctrl) => {
//   const func = async (req, res, next) => {
//     try {
//       await ctrl(req, res, next);
//     } catch (error) {
//       next(error);
//     }
//   };
//   return func;
// };

// const signup = async (req, res, next) => {
//   try {
//     const { error } = userSignupSchema.validate(req.body);
//     if (error) {
//       throw HttpError(400, error.message);
//     }
//     const { email, password } = req.body;
//     const user = await User.findOne({ email });
//     if (user) {
//       throw HttpError(409, "Email in use");
//     }
//     const hashPassword = await bcrypt.hash(password, 10);
//     const newUser = await User.create({ ...req.body, password: hashPassword });

//     res.status(201).json({
//       user: {
//         email: newUser.email,
//         subscription: newUser.subscription,
//       },
//     });
//   } catch (error) {
//     next(error);
//   }
// };
// -------------------------------------------------------------------
// http://localhost:3000/api/auth/signin
// "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1NjcyN2YzNDZhMTNkMzVhYWE1OWUwMCIsImlhdCI6MTcwMTI4MTY2NywiZXhwIjoxNzAxMzY0NDY3fQ.eeWhAeCSkp1GQbNDvaIm6IndSkj_ihylIKrh7Ks0Qvo"

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1NjcyN2YzNDZhMTNkMzVhYWE1OWUwMCIsImlhdCI6MTcwMTI4MTY2NywiZXhwIjoxNzAxMzY0NDY3fQ.eeWhAeCSkp1GQbNDvaIm6IndSkj_ihylIKrh7Ks0Qvo

// res.status(201).json({
//   username: newUser.username,
//   email: newUser.email,
// });

// const ctrlWrapper = ctrl => {
//     const func = async(req, res, next)=> {
//         try {
//             await ctrl(req, res, next);
//         }
//         catch(error) {
//             next(error);
//         }
//     }
//     return func;
// }
