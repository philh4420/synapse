import { cloudinaryConfig } from '../firebaseConfig';
import CryptoJS from 'crypto-js';

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = cloudinaryConfig.folder;
  
  // Generate signature
  // Signature = SHA1(sorted_params + api_secret)
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${cloudinaryConfig.apiSecret}`;
  const signature = CryptoJS.SHA1(paramsToSign).toString();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', cloudinaryConfig.apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('folder', folder);
  formData.append('signature', signature);

  try {
    // Use 'auto' instead of 'image' to support both images and videos
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};