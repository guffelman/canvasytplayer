const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const youtubeSearchApi = require('youtube-search-api');  // Import the YouTube search API

const app = express();
const PORT = 3000;

// Set up video storage location
const downloadFolder = path.join(__dirname, 'downloads');

// Create the 'downloads' folder if it doesn't exist
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder);
}

// Middleware to serve static files from the 'downloads' folder
app.use('/downloads', express.static(downloadFolder));

// Utility function to fetch video details
async function getVideoDetails(videoId) {
  try {
    const videoDetails = await youtubeSearchApi.GetVideoDetails(videoId);
    return {
      title: videoDetails.title,
      channel: videoDetails.channel, // Get the channel name (uploader's username)
      thumbnail: `https://img.youtube.com/vi/${videoId}/0.jpg`
    };
  } catch (error) {
    throw new Error('Failed to fetch video details');
  }
}

// Serve the homepage (index.html) for the default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the video player page
app.get('/play/:videoId', (req, res) => {
  const { videoId } = req.params;
  res.sendFile(path.join(__dirname, 'videoPlayer.html'));
});

// Route to handle video download
app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: 'No URL provided' });
  }

  // Extract the video ID from the URL
  const videoIdMatch = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (!videoIdMatch) {
    return res.status(400).json({ error: 'Invalid YouTube URL format' });
  }
  
  const videoId = videoIdMatch[1]; // Extract video ID
  const videoPath = path.join(downloadFolder, `${videoId}.mp4`);
  const audioPath = path.join(downloadFolder, `${videoId}.mp3`);

  try {
    // Fetch video details from YouTube API
    const { title, channel, thumbnail } = await getVideoDetails(videoId);

    // Check if the video is already downloaded
    if (fs.existsSync(videoPath) && fs.existsSync(audioPath)) {
      return res.json({
        message: 'Video already downloaded.',
        videoUrl: `/downloads/${videoId}.mp4`,
        audioUrl: `/downloads/${videoId}.mp3`,
        videoTitle: title,
        uploader: channel,  // Send the uploader's username
        thumbnail: thumbnail,
      });
    }

    // Run yt-dlp to download the video and audio
    const videoDownloadCommand = `yt-dlp -f bestvideo+bestaudio --merge-output-format mp4 -o "${videoPath}" ${videoUrl}`;

    exec(videoDownloadCommand, (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ error: 'Video download failed', details: stderr });
      }

      res.json({
        message: 'Download complete',
        videoUrl: `/downloads/${videoId}.mp4`,
        audioUrl: `/downloads/${videoId}.mp3`,
        videoTitle: title,
        uploader: channel,  // Send the uploader's username
        thumbnail: thumbnail,
      });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch video details', details: error.message });
  }
});

// Route to list all downloaded videos
app.get('/videos', async (req, res) => {
  const files = fs.readdirSync(downloadFolder).filter(file => file.endsWith('.mp4'));
  
  // Fetch metadata for each video asynchronously
  const videoDetailsPromises = files.map(async (file) => {
    const videoId = file.replace('.mp4', '');
    const { title, channel, thumbnail } = await getVideoDetails(videoId);

    return {
      videoId: videoId,
      videoUrl: `/downloads/${file}`,
      audioUrl: `/downloads/${file.replace('.mp4', '.mp3')}`,
      videoTitle: title,
      uploader: channel,  // Uploader's username
      thumbnail: thumbnail,  // Thumbnail URL
    };
  });

  try {
    // Wait for all the video details to be fetched asynchronously
    const videos = await Promise.all(videoDetailsPromises);
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching video details', details: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
