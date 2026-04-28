const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const DiaryEntry = require("../models/DiaryEntry");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// ------------------ CLOUDINARY CONFIG ------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------ MULTER CONFIG for media upload (Cloudinary) ------------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "travel-diary",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, crop: "limit" }],
  },
});
const upload = multer({ storage });

// ------------------ CREATE a diary post ------------------
router.post("/", auth, upload.array("media", 5), async (req, res) => {
  try {
    const { title, description, location, coordinates } = req.body;
    const media = req.files ? req.files.map((file) => file.path) : [];

    const diaryEntry = new DiaryEntry({
      user: req.user.id,
      title,
      description,
      location,
      media,
    });

    await diaryEntry.save();
    res.status(201).json({ msg: "Diary created successfully", diaryEntry });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ GET diary posts by logged-in user ------------------
router.get("/my", auth, async (req, res) => {
  try {
    const posts = await DiaryEntry.find({ user: req.user.id })
      .populate("user", "name email profilePic")
      .populate("comments")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ GET diary posts by user ID ------------------
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await DiaryEntry.find({ user: req.params.userId })
      .populate("user", "name email profilePic")
      .populate("comments")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ GET all diary posts ------------------
router.get("/", async (req, res) => {
  try {
    const posts = await DiaryEntry.find()
      .populate("user", "name email profilePic")
      .populate("comments")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ GET single diary post ------------------
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await DiaryEntry.findById(req.params.id)
      .populate("user", "name email profilePic")
      .populate("comments");

    if (!post) return res.status(404).json({ msg: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ UPDATE diary post ------------------
router.put("/:id", auth, async (req, res) => {
  try {
    const { title, description, location, media, coordinates } = req.body;

    const post = await DiaryEntry.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized" });

    post.title = title || post.title;
    post.description = description || post.description;
    post.location = location || post.location;
    post.media = media || post.media;
    post.coordinates = coordinates ? JSON.parse(coordinates) : post.coordinates;

    await post.save();
    res.json({ msg: "Post updated successfully", post });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ DELETE diary post ------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await DiaryEntry.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (req.user.role !== "admin")
      return res.status(403).json({ msg: "Access denied: Admin only can delete posts" });

    await post.deleteOne();
    res.json({ msg: "Post deleted successfully by admin" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ LIKE / UNLIKE a post ------------------
router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await DiaryEntry.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const userId = req.user.id;
    if (post.likes.includes(userId)) {
      post.likes = post.likes.filter((id) => id.toString() !== userId); // unlike
    } else {
      post.likes.push(userId); // like
    }

    await post.save();
    res.json({
      msg: post.likes.includes(userId) ? "Post liked" : "Post unliked",
      likesCount: post.likes.length,
      likes: post.likes
    });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ GET diary posts by location ------------------
router.get("/location/:place", async (req, res) => {
  try {
    const posts = await DiaryEntry.find({ location: req.params.place })
      .populate("user", "name profilePic")
      .populate("comments")
      .sort({ createdAt: -1 });

    res.json({ posts });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;
