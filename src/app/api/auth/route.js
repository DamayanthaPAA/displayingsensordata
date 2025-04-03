import { dbConnect } from "../../../utils/mongoose";


import User from "../../../models/User";
import jwt from "jsonwebtoken";

export async function POST(req) {
  await dbConnect();
  alert("Login route");
  try {
    
    const { email, password } = await req.json();

    const user = await User.findOne({ email });
    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
    }

    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ message: "Invalid password" }), { status: 401 });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return new Response(JSON.stringify({ token }), { status: 200 });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}
