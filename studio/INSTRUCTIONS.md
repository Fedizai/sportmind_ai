# CORS Configuration Instructions for Firebase Storage

To allow your web application to upload files directly to your Firebase Storage bucket, you need to configure Cross-Origin Resource Sharing (CORS) on the underlying Google Cloud Storage bucket.

**Why is this necessary?**

Web browsers enforce a security policy that restricts web pages from making requests to a different domain than the one that served the page. By default, your Firebase Storage bucket has a different domain, and this policy will block uploads from your app unless you explicitly allow it by setting a CORS policy.

## Steps to Configure CORS

You will need to use the `gsutil` command-line tool, which is part of the Google Cloud SDK.

### 1. Install the Google Cloud SDK

If you don't have it installed, follow the official instructions to install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).

### 2. Authenticate with Google Cloud

After installation, you need to authenticate `gsutil` with your Google Cloud account:

```bash
gcloud auth login
```

This command will open a browser window for you to log in to your Google account that is associated with your Firebase project.

### 3. Identify Your Storage Bucket URL

Your Firebase Storage bucket has a unique URL that starts with `gs://`. You can find this URL in two places:

-   **In your Firebase Console:** Go to `Storage`, and at the top of the files viewer, you will see the bucket URL (e.g., `gs://your-project-id.appspot.com`).
-   **In your Firebase project settings:** Look for the `storageBucket` value in your Firebase configuration object. Add `gs://` to the beginning of it.

### 4. Apply the CORS Configuration

This project includes a `storage.cors.json` file with the recommended CORS settings. Navigate to your project's root directory in your terminal and run the following command, replacing `[YOUR_BUCKET_URL]` with the URL you found in the previous step:

```bash
gsutil cors set storage.cors.json [YOUR_BUCKET_URL]
```

**Example:**

```bash
gsutil cors set storage.cors.json gs://sportmind-ai-12345.appspot.com
```

### 5. Verify the Configuration (Optional)

You can verify that the settings have been applied correctly by running:

```bash
gsutil cors get [YOUR_BUCKET_URL]
```

This should print a JSON output that matches the content of the `storage.cors.json` file.

After completing these steps, your video uploads should no longer get stuck, and any remaining issues should now produce clear error messages in your browser's developer console.
