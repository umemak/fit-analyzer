// Cloudflare Pages Function for Web Share Target API
// Handles shared files from native apps (e.g., COROS app)

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const contentType = context.request.headers.get("content-type") || "";
    
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Invalid content type", { status: 400 });
    }

    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response("No file provided", { status: 400 });
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".fit")) {
      return new Response("Only .fit files are supported", { status: 400 });
    }

    // Store file in cache for retrieval by main app
    const cache = await caches.open("fit-analyzer-v2");
    
    // Create a response with the file data
    const fileBlob = await file.arrayBuffer();
    const response = new Response(fileBlob, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": file.name,
      },
    });
    
    // Cache the file
    await cache.put("/shared-file", response);

    // Redirect to home with shared flag
    return Response.redirect("/?shared=true", 303);
  } catch (error) {
    console.error("Share error:", error);
    return new Response("Failed to process shared file", { status: 500 });
  }
};
