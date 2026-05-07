const CLOUD_NAME = "dfflcsnj4";
const upload_preset = "sos_folder";

export async function uploadVideo(fileUri: string): Promise<string> {
  return uploadMedia(fileUri, "video");
}

export async function uploadPhoto(fileUri: string): Promise<string> {
  return uploadMedia(fileUri, "image");
}

async function uploadMedia(
  fileUri: string,
  resourceType: "video" | "image"
): Promise<string> {

  const formData = new FormData();

  formData.append("file", {
    uri: fileUri,
    type: resourceType === "video"
      ? "video/mp4"
      : "image/jpeg",
    name: `${Date.now()}.${resourceType === "video" ? "mp4" : "jpg"}`
  } as any);

  formData.append("upload_preset", upload_preset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData
    }
  );

  const data = await response.json();

  console.log("Cloudinary Response:", data);

  if (!data.secure_url) {
    throw new Error(data.error?.message || "Upload failed");
  }

  return data.secure_url;
}