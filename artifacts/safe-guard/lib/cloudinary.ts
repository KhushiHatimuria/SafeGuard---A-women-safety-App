const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "dfficsnj4";
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "ml_default";

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  duration?: number;
  format: string;
};

export async function uploadVideoToCloudinary(
  fileUri: string,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

  const formData = new FormData();
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("file", {
    uri: fileUri,
    type: "video/mp4",
    name: `safeguard_${Date.now()}.mp4`,
  } as any);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.open("POST", url);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid response from Cloudinary"));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}
