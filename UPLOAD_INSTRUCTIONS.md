# Quick Image Upload Reference

## Where to Upload Images

### For Product Images
- **Admin Page**: Go to `/admin/products`
- **Button**: Click "Upload Image" on any product
- **Directory**: Saves to `backend/uploads/products/`
- **Access**: Available at `/api/images/products/:filename`

### Upload Details
| Parameter | Product Images | Profile Images |
|-----------|---|---|
| Endpoint | `/api/images/upload/product` | `/api/images/upload/profile` |
| Max Size | 5 MB | 3 MB |
| Formats | JPEG, PNG, WebP, GIF | JPEG, PNG, WebP, GIF |
| Save Path | `uploads/products/` | `uploads/profiles/` |
| Output Format | WebP (optimized) | WebP (optimized) |

## Upload Steps

### Via Admin Dashboard
1. Open `http://localhost:5173/admin/products`
2. Fill product details (name, price, category, stock)
3. Click "Upload Image" button
4. Select image file
5. Image auto-optimizes and associates with product
6. Save product

### Via API Call (Example)
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('/api/images/upload/product', {
  method: 'POST',
  body: formData
});

const data = await response.json();
console.log('Image URL:', data.imageUrl);
```

## Image Naming Convention

After upload, images are named:
- `originalname-[timestamp]-[random].webp`
- Example: `shoe-1717225483123-734629584.webp`

This ensures:
- ✅ Unique filenames (no conflicts)
- ✅ WebP format (optimized)
- ✅ Traceable uploads (timestamp)

## Important Notes

- Images are automatically optimized to WebP
- Original files are deleted after optimization
- Images are resized to max 800x800px
- Compression is set to 80% quality
- All image operations are in `backend/uploads/` folder
