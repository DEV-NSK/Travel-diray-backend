const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const admin = require("../middleware/adminMiddleware");
const User = require("../models/User");
const DiaryEntry = require("../models/DiaryEntry");
const Comment = require("../models/Comment");

// ------------------ Admin Dashboard ------------------
router.get("/dashboard", auth, admin, async (req, res) => {
  try {
    // Get all users
    const users = await User.find().select("-password");

    // For each user, get diary posts and their comments
    const dashboardData = await Promise.all(
      users.map(async (user) => {
        const posts = await DiaryEntry.find({ user: user._id })
          .populate("comments") // populate comments for each post
          .sort({ createdAt: -1 });

        return {
          user,
          posts,
        };
      })
    );

    res.json({ dashboard: dashboardData });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ Delete a user (admin only) ------------------
router.delete("/user/:id", auth, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Delete user's posts and comments
    const posts = await DiaryEntry.find({ user: user._id });
    for (let post of posts) {
      // Delete comments linked to this post
      await Comment.deleteMany({ diaryEntry: post._id });
      await post.deleteOne();
    }

    // Delete user's comments elsewhere
    await Comment.deleteMany({ user: user._id });

    // Delete user
    await user.deleteOne();

    res.json({ msg: "User and all associated posts/comments deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ Delete a diary post (admin only) ------------------
router.delete("/post/:id", auth, admin, async (req, res) => {
  try {
    const post = await DiaryEntry.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    // Delete comments linked to this post
    await Comment.deleteMany({ diaryEntry: post._id });
    await post.deleteOne();

    res.json({ msg: "Diary post and associated comments deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ Delete a comment (admin only) ------------------
router.delete("/comment/:id", auth, admin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    await comment.deleteOne();

    // Remove reference from diaryEntry
    const diary = await DiaryEntry.findById(comment.diaryEntry);
    if (diary) {
      diary.comments = diary.comments.filter(
        (c) => c.toString() !== comment._id.toString()
      );
      await diary.save();
    }

    res.json({ msg: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;
