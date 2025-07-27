import path from "path"
import express from 'express';

export const staticPath = express.static(path.join(__dirname, '..','..', 'public'));
// This middleware serves static files from the 'public' directory
// It allows you to access files like logo.png directly via the URL
// For example, if you have a file public/logo.png, it can be accessed at /logo.png
// Make sure to place your static files in the 'public' directory at the root of your project
// This is useful for serving images, stylesheets, and other static assets