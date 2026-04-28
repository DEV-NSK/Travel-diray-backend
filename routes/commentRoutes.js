// const express = require("express");
// const router = express.Router();

// // Test route
// router.get("/", (req, res) => {
//   res.send("Comment routes working...");
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Comment = require("../models/Comment");
const DiaryEntry = require("../models/DiaryEntry");

// ------------------ CREATE comment ------------------
router.post("/:diaryId", auth, async (req, res) => {
  try {
    const { text } = req.body;

    const diary = await DiaryEntry.findById(req.params.diaryId);
    if (!diary) return res.status(404).json({ msg: "Diary post not found" });

    const comment = new Comment({
      user: req.user.id,
      diaryEntry: req.params.diaryId,
      text,
    });

    await comment.save();

    // Add comment reference to diaryEntry
    diary.comments.push(comment._id);
    await diary.save();

    res.status(201).json({ msg: "Comment added", comment });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ GET comments for a diary post ------------------
router.get("/:diaryId", auth, async (req, res) => {
  try {
    const comments = await Comment.find({ diaryEntry: req.params.diaryId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

// ------------------ DELETE comment ------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    // Only comment author or admin can delete
    if (comment.user.toString() !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ msg: "Not authorized" });

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
