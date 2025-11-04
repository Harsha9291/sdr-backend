import cloudinary from '../config/cloudinary.js';
import { Readable } from 'stream';
import { apiResponse } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asynchandler.js';

const uploadImage = asyncHandler(async (req, res) => {
  console.log("req.file", req.file);  

  if (!req.file) {
    return res.status(400).json(new apiResponse(400, null, "No file uploaded"));
  }

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto' },  
      (error, result) => {
        if (error) {
          return res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
        }
        return res.status(200).json(new apiResponse(200, { imageUrl: result.secure_url }, "File uploaded successfully"));
      }
    );

    Readable.from(req.file.buffer).pipe(uploadStream);

  } catch (err) {
    console.error("Error during upload:", err);
    res.status(500).json({ error: err.message });
  }
});


export { uploadImage };
