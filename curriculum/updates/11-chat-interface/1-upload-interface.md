# Building the Upload Interface

Before users can chat, they need to upload content. Let's build a flexible upload UI that supports both URLs and raw text.

---

## What You'll Build

By the end of this section:
- Upload form with **two modes**: URLs and Raw Text
- Client-side logic to call appropriate upload API
- Status feedback for users

---

## The Upload Flow

```
User selects mode: URLs or Raw Text
        ↓
Enter content in textarea
        ↓
Click "Upload" button
        ↓
Call /api/upload-document (URLs) or /api/upload-text (text)
        ↓
Show success/error message
```

---

## Understanding the Code

Located at: `app/page.tsx` (upload section)

### State Management

```typescript
const [uploadContent, setUploadContent] = useState('');
const [uploadType, setUploadType] = useState<'urls' | 'text'>('urls');
const [isUploading, setIsUploading] = useState(false);
const [uploadStatus, setUploadStatus] = useState('');
```

**Four pieces of state:**
- `uploadContent`: Text in the textarea (URLs or raw text)
- `uploadType`: Current mode ('urls' or 'text')
- `isUploading`: Loading indicator
- `uploadStatus`: Success/error message

### The Upload Handler

```typescript
const handleUpload = async () => {
  if (!uploadContent.trim()) return;

  setIsUploading(true);
  setUploadStatus('');

  try {
    if (uploadType === 'urls') {
      // Upload URLs
      const urls = uploadContent
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);

      const response = await fetch('/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(`✅ Success! Uploaded ${data.vectorsUploaded} vectors`);
        setUploadContent('');
      } else {
        setUploadStatus(`❌ Error: ${data.error}`);
      }
    } else {
      // Upload raw text
      const response = await fetch('/api/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: uploadContent }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus(
          `✅ Success! Uploaded ${data.vectorsUploaded} vectors from text`
        );
        setUploadContent('');
      } else {
        setUploadStatus(`❌ Error: ${data.error}`);
      }
    }
  } catch {
    setUploadStatus('❌ Failed to upload content');
  } finally {
    setIsUploading(false);
  }
};
```

**Step-by-step:**

**1. Guard clause**
```typescript
if (!uploadContent.trim()) return;
```
Don't submit empty input.

**2. Set loading state**
```typescript
setIsUploading(true);
setUploadStatus('');
```
Show loading, clear previous status.

**3. Branch based on upload type**

**For URLs:**
```typescript
const urls = uploadContent
  .split('\n')           // Split by newline
  .map(url => url.trim()) // Remove whitespace
  .filter(Boolean);       // Remove empty strings

const response = await fetch('/api/upload-document', {
  method: 'POST',
  body: JSON.stringify({ urls }),
});
```

**For raw text:**
```typescript
const response = await fetch('/api/upload-text', {
  method: 'POST',
  body: JSON.stringify({ text: uploadContent }),
});
```

**Key difference:** URLs are parsed and split, raw text is sent as-is.

**4. Handle response**
```typescript
if (response.ok) {
  setUploadStatus(`✅ Success! Uploaded ${data.vectorsUploaded} vectors`);
  setUploadContent(''); // Clear input
} else {
  setUploadStatus(`❌ Error: ${data.error}`);
}
```

---

## The UI Components

### Mode Toggle Buttons

```typescript
<div className='flex gap-2 mb-4'>
  <button
    onClick={() => setUploadType('urls')}
    className={`px-4 py-2 rounded ${
      uploadType === 'urls'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    URLs
  </button>
  <button
    onClick={() => setUploadType('text')}
    className={`px-4 py-2 rounded ${
      uploadType === 'text'
        ? 'bg-blue-600 text-white'
        : 'bg-gray-200 text-gray-700'
    }`}
  >
    Raw Text
  </button>
</div>
```

**Key features:**
- Conditional styling based on `uploadType`
- Active button: blue background with white text
- Inactive button: gray background with dark text
- Clear visual feedback for selected mode

**Why conditional classes?**
```typescript
uploadType === 'urls'
  ? 'bg-blue-600 text-white'    // Active
  : 'bg-gray-200 text-gray-700' // Inactive
```
Provides clear visual state to user.

### Textarea with Dynamic Placeholder

```typescript
<textarea
  value={uploadContent}
  onChange={(e) => setUploadContent(e.target.value)}
  placeholder={
    uploadType === 'urls'
      ? 'Enter URLs (one per line)\nExample:\nhttps://react.dev/learn'
      : 'Paste your text content here...\n\nThis can be documentation, articles, or any text.'
  }
  className='w-full p-2 border rounded mb-2 h-32'
  disabled={isUploading}
/>
```

**Key attributes:**
- `value={uploadContent}`: Controlled component
- `onChange`: Update state on type
- `disabled={isUploading}`: Prevent edits while uploading
- Dynamic `placeholder`: Changes based on mode
- `h-32`: Fixed height (8rem)

**Why dynamic placeholder?**
Provides context-specific guidance:
- URLs mode: Shows example URLs
- Text mode: Explains what to paste

### Upload Button

```typescript
<button
  onClick={handleUpload}
  disabled={isUploading || !uploadContent.trim()}
  className='px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400'
>
  {isUploading ? 'Uploading...' : 'Upload'}
</button>
```

**Important styling note:**
```typescript
className='bg-blue-600 text-white'
```
We explicitly set `text-white` to ensure button text is visible against the blue background. Without this, button text may be hard to read depending on your global styles.

**Disabled when:**
- `isUploading`: Already in progress
- `!uploadContent.trim()`: Empty or whitespace-only

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

### Test 1: URLs Mode - Single URL

**Mode:** URLs

```
Input:
https://react.dev/learn

Expected:
✅ Success! Uploaded 47 vectors
```

### Test 2: URLs Mode - Multiple URLs

**Mode:** URLs

```
Input:
https://react.dev/learn
https://react.dev/reference/react/useState
https://nextjs.org/docs

Expected:
✅ Success! Uploaded 142 vectors
```

### Test 3: Text Mode - Documentation

**Mode:** Raw Text

```
Input:
React is a JavaScript library for building user interfaces.

Hooks are functions that let you "hook into" React state and
lifecycle features from function components.

The most commonly used hooks are useState and useEffect.

Expected:
✅ Success! Uploaded 3 vectors from text
```

### Test 4: Text Mode - Long Article

**Mode:** Raw Text

Paste 5,000+ character article.

Expected:
✅ Success! Uploaded 10-15 vectors from text (depending on length)

### Test 5: Empty Input

Click upload without entering content in either mode.

Expected: Nothing happens (guard clause prevents submission)

### Test 6: Invalid URL

**Mode:** URLs

```
Input:
not-a-valid-url

Expected:
❌ Error: Failed to scrape content from not-a-valid-url
```

### Test 7: Mode Switching

1. Enter content in URLs mode
2. Switch to Raw Text mode
3. Notice placeholder updates
4. Switch back to URLs mode
5. Previous content still there (state preserved)

Expected: Smooth mode switching with preserved content

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

✅ How to build a dual-mode upload interface (URLs + Text)
✅ Implementing mode toggle with conditional styling
✅ Parsing user input (split, trim, filter for URLs)
✅ Calling different API routes based on mode
✅ Managing loading and error states
✅ Providing clear user feedback with visible button text
✅ Dynamic placeholders for better UX

---

## Key Takeaways

**Two upload modes:**
- **URLs**: Scrape content from web pages
- **Raw Text**: Direct text upload for custom content

**Why raw text matters:**
- User can upload personal notes
- Documentation not available online
- Content behind authentication
- Quick testing without URLs

**Styling best practices:**
- Always specify text color on colored backgrounds (`text-white` on `bg-blue-600`)
- Use conditional styling for interactive states
- Provide clear visual feedback for mode selection

---

## What's Next

Now that users can upload both URLs and raw text, let's build the chat interface so they can query their content!

---

## Video Walkthrough

<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/upload-interface" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>
