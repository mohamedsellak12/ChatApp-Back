import express from "express";

import { getStoriesForCurrentUser, getUserContactStories } from "../controllers/storyController.js";
import {protect}  from "../middleware/authMiddleware.js";


const storyRouter = express.Router();

storyRouter.get("/all",protect,getUserContactStories)
storyRouter.get("/mine", protect, getStoriesForCurrentUser)

export default storyRouter ;