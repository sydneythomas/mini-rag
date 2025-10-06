# Building the Upload Interface

Before users can chat, they need to upload documents. Let's build a simple upload UI.

---

## What You'll Build

By the end of this section:
- Upload form for entering URLs
- Client-side logic to call upload API
- Status feedback for users

---

## The Upload Flow

```
User enters URLs (one per line)
        ↓
Click "Upload" button
        ↓
Parse URLs, call /api/upload-document
        ↓
Show success/error message
```

---

## Understanding the Code

Located at: `app/page.tsx` (upload section)

### State Management

```typescript
const [uploadUrls, setUploadUrls] = useState('');
const [isUploading, setIsUploading] = useState(false);
const [uploadStatus, setUploadStatus] = useState('');
```

**Three pieces of state:**
- `uploadUrls`: Text in the textarea
- `isUploading`: Loading indicator
- `uploadStatus`: Success/error message

### The Upload Handler

```typescript
const handleUpload = async () => {
  if (!uploadUrls.trim()) return;

  setIsUploading(true);
  setUploadStatus('');

  try {
    // Parse URLs (split by newline)
    const urls = uploadUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);

    // Call upload API
    const response = await fetch('/api/upload-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    });

    const data = await response.json();

    // Show result
    if (response.ok) {
      setUploadStatus(`✅ Success! Uploaded ${data.vectorsUploaded} vectors`);
      setUploadUrls('');
    } else {
      setUploadStatus(`❌ Error: ${data.error}`);
    }
  } catch {
    setUploadStatus('❌ Failed to upload documents');
  } finally {
    setIsUploading(false);
  }
};
```

**Step-by-step:**

**1. Guard clause**
```typescript
if (!uploadUrls.trim()) return;
```
Don't submit empty input.

**2. Set loading state**
```typescript
setIsUploading(true);
setUploadStatus('');
```
Show loading, clear previous status.

**3. Parse URLs**
```typescript
const urls = uploadUrls
  .split('\n')           // Split by newline
  .map(url => url.trim()) // Remove whitespace
  .filter(Boolean);       // Remove empty strings
```

**Why filter(Boolean)?** Removes empty lines:
```typescript
['https://react.dev', '', 'https://nextjs.org', '']
  → ['https://react.dev', 'https://nextjs.org']
```

**4. Call API**
```typescript
const response = await fetch('/api/upload-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ urls }),
});
```

**5. Handle response**
```typescript
if (response.ok) {
  setUploadStatus(`✅ Success! Uploaded ${data.vectorsUploaded} vectors`);
  setUploadUrls(''); // Clear input
} else {
  setUploadStatus(`❌ Error: ${data.error}`);
}
```

---

## The UI Components

### Textarea

```typescript
<textarea
  value={uploadUrls}
  onChange={(e) => setUploadUrls(e.target.value)}
  placeholder='Enter URLs (one per line)'
  className='w-full p-2 border rounded mb-2 h-24'
  disabled={isUploading}
/>
```

**Key attributes:**
- `value={uploadUrls}`: Controlled component
- `onChange`: Update state on type
- `disabled={isUploading}`: Prevent edits while uploading
- `h-24`: Fixed height (6rem)

### Upload Button

```typescript
<button
  onClick={handleUpload}
  disabled={isUploading || !uploadUrls.trim()}
  className='px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400'
>
  {isUploading ? 'Uploading...' : 'Upload'}
</button>
```

**Disabled when:**
- `isUploading`: Already in progress
- `!uploadUrls.trim()`: Empty or whitespace-only

**Dynamic text:**
```typescript
{isUploading ? 'Uploading...' : 'Upload'}
```
Shows loading state to user.

### Status Message

```typescript
{uploadStatus && (
  <p className='mt-2 text-sm'>{uploadStatus}</p>
)}
```

Only renders if `uploadStatus` has content.

---

## Testing the Upload

### Test 1: Single URL

```
Input:
https://react.dev/learn

Expected:
✅ Success! Uploaded 47 vectors
```

### Test 2: Multiple URLs

```
Input:
https://react.dev/learn
https://react.dev/reference/react/useState
https://nextjs.org/docs

Expected:
✅ Success! Uploaded 142 vectors
```

### Test 3: Empty Input

Click upload without entering URLs.

Expected: Nothing happens (guard clause prevents submission)

### Test 4: Invalid URL

```
Input:
not-a-valid-url

Expected:
❌ Error: Failed to scrape content from not-a-valid-url
```

### Test 5: With Empty Lines

```
Input:
https://react.dev


https://nextjs.org

Expected:
Empty lines ignored, uploads 2 URLs
```

---

## Common Issues

### "Failed to upload documents"

**Possible causes:**
- Network error
- API route not running
- CORS issues

**Debug:**
```typescript
try {
  const response = await fetch(...);
  console.log('Response:', response.status, await response.text());
} catch (error) {
  console.error('Upload error:', error);
}
```

### Button stays disabled

**Check:**
- Is `isUploading` stuck as `true`?
- Is `finally` block running?

**Fix:** Ensure `finally` always runs:
```typescript
} finally {
  setIsUploading(false);
}
```

### Status message doesn't update

**Check:**
- Is `setUploadStatus` being called?
- Are you clearing previous status?

**Fix:**
```typescript
setUploadStatus(''); // Clear at start
```

---

## Improving the UX

### 1. Show Progress

```typescript
const [progress, setProgress] = useState('');

// In handleUpload:
setProgress(`Uploading ${urls.length} URLs...`);

// After response:
setProgress('');
```

### 2. Disable Input During Upload

Already done:
```typescript
disabled={isUploading}
```

### 3. Validate URLs Before Submitting

```typescript
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// In handleUpload:
const invalidUrls = urls.filter(url => !isValidUrl(url));
if (invalidUrls.length > 0) {
  setUploadStatus(`❌ Invalid URLs: ${invalidUrls.join(', ')}`);
  return;
}
```

### 4. Show Per-URL Status

```typescript
const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

// Show list:
{uploadedUrls.map(url => (
  <div key={url}>✅ {url}</div>
))}
```

---

## What You Learned

✅ How to build a multi-line URL input
✅ Parsing user input (split, trim, filter)
✅ Calling API routes from client
✅ Managing loading and error states
✅ Providing clear user feedback

---

## What's Next

Now that users can upload documents, let's build the chat interface so they can query them!

---

## Video Walkthrough

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/upload-interface" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
