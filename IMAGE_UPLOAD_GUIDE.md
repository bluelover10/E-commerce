# E-Commerce Store with Image Optimization

## Overview

This is a full-stack e-commerce application built with:
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Image Handling**: Multer + Sharp (for optimization)

## Image Upload System

### Directory Structure for Images

```
backend/
├── uploads/
│   ├── products/        # Product images (5MB max each)
│   └── profiles/        # User profile images (3MB max each)
```

### Upload Endpoints

#### 1. **Upload Product Image**
- **Endpoint**: `POST /api/images/upload/product`
- **Headers**: `multipart/form-data`
- **Body**: Form data with `image` field
- **Allowed formats**: JPEG, PNG, WebP, GIF
- **Max size**: 5MB
- **Response**:
```json
{
  "success": true,
  "imageUrl": "/api/images/products/filename-optimized.webp",
  "filename": "filename-optimized.webp",
  "path": "/full/path/to/file"
}
```

#### 2. **Upload Profile Image**
- **Endpoint**: `POST /api/images/upload/profile`
- **Headers**: `multipart/form-data`
- **Body**: Form data with `image` field
- **Allowed formats**: JPEG, PNG, WebP, GIF
- **Max size**: 3MB

#### 3. **Delete Image**
- **Endpoint**: `POST /api/delete`
- **Body**:
```json
{
  "filename": "image-name.webp",
  "type": "products"  // or "profiles"
}
```

#### 4. **Get Image List**
- **Endpoint**: `GET /api/images/list/:type`
- **URL params**: `type` - "products" or "profiles"
- **Response**: Array of image objects with metadata

#### 5. **Serve Image**
- **Endpoint**: `GET /api/images/products/:filename` or `GET /api/images/profiles/:filename`
- Directly serves the image file

### Image Optimization

All uploaded images are automatically:
- **Resized** to max 800x800px (maintains aspect ratio)
- **Converted** to WebP format (better compression)
- **Compressed** with 80% quality
- **Original file removed** after optimization

### How to Upload Images

#### From Frontend (Admin Page)

1. Navigate to `/admin/products`
2. Click "Upload Image" button on any product
3. Select an image file (JPEG, PNG, WebP, or GIF)
4. Image is optimized and associated with the product

#### Using curl (Command Line)

```bash
# Upload product image
curl -X POST http://localhost:5000/api/images/upload/product \
  -F "image=@/path/to/image.jpg"

# Upload profile image
curl -X POST http://localhost:5000/api/images/upload/profile \
  -F "image=@/path/to/profile.jpg"
```

#### Using JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('/api/images/upload/product', {
  method: 'POST',
  body: formData
})
.then(res => res.json())
.then(data => console.log(data));
```

### Product Management

#### Create Product with Image
```javascript
// Step 1: Upload image
const imageResponse = await fetch('/api/images/upload/product', {
  method: 'POST',
  body: formData
});
const { imageUrl } = await imageResponse.json();

// Step 2: Create product with image URL
const productResponse = await fetch('/api/products', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Product Name',
    price: 99.99,
    image: imageUrl,
    category: 'Electronics'
  }),
  headers: { 'Content-Type': 'application/json' }
});
```

#### Update Product Image
```
POST /api/products/:id/image
Body: { "imageUrl": "/api/images/products/filename.webp" }
```

## Available Pages

### User Pages
- **Home** (`/`) - Landing page with featured products
- **Products** (`/products`) - Browse all products with filters
- **Product Details** (`/product/:id`) - View product details and images
- **Cart** (`/cart`) - Shopping cart
- **Login** (`/login`) - User login
- **Register** (`/register`) - User registration
- **About** (`/about`) - About us page
- **Contact** (`/contact`) - Contact form

### Admin Pages
- **Product Management** (`/admin/products`) - Create, edit, delete products with image uploads

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/image` - Add image to product

### Images
- `POST /api/images/upload/product` - Upload product image
- `POST /api/images/upload/profile` - Upload profile image
- `GET /api/images/products/:filename` - Serve product image
- `GET /api/images/profiles/:filename` - Serve profile image
- `GET /api/images/list/:type` - Get image list
- `POST /api/images/delete` - Delete image

## Installation & Setup

### Server Setup (API)

1. **Install dependencies**:
```bash
cd server
npm install
```

2. **Create `.env` file**:
```bash
cp .env.example .env
```

3. **Configure MongoDB**:
   - Update `MONGODB_URI` in `.env`
   - Ensure MongoDB is running locally or use Atlas

4. **Start server**:
```bash
npm run dev
```

### Client Setup (Web)

1. **Install dependencies**:
```bash
cd client
npm install
```

2. **Start dev server**:
```bash
npm run dev
```

3. **Access**:
   - Client: `http://localhost:5173`
   - Backend: `http://localhost:5000`

## Database Schema Updates

### Product Model
```javascript
{
  name: String (required),
  description: String,
  price: Number (required),
  image: String (main image URL),
  images: [{
    url: String,
    uploadedAt: Date
  }],
  category: String,
  stock: Number,
  rating: Number,
  reviews: [{
    user: ObjectId,
    comment: String,
    rating: Number,
    createdAt: Date
  }],
  timestamps: true
}
```

## Component Structure

### Frontend Components
- `ImageUpload.jsx` - Image upload component
- `ProductCard.jsx` - Product display card
- `AdminProducts.jsx` - Product management page
- `ProductsPage.jsx` - Products listing with filters
- `ProductDetails.jsx` - Detailed product view

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

## Performance Optimization

- Images are optimized to WebP format (25-35% smaller than JPEG)
- Automatic resizing prevents oversized images
- Static file serving with caching headers
- MongoDB indexing on product queries

## Security Features

- File type validation (only images allowed)
- File size limits enforced
- Unique filenames prevent conflicts
- CORS enabled for cross-origin requests

## Troubleshooting

### Images not uploading
- Check file size (max 5MB for products, 3MB for profiles)
- Verify file format (JPEG, PNG, WebP, GIF)
- Ensure uploads directory has write permissions

### MongoDB connection failed
- Verify MongoDB is running
- Check connection string in `.env`
- Ensure correct host/port/credentials

### Images not displaying
- Clear browser cache
- Check image path in database
- Verify file exists in uploads directory

## Future Enhancements

- [ ] Image compression levels user selection
- [ ] Batch image upload
- [ ] Image cropping editor
- [ ] CDN integration
- [ ] Image versioning
- [ ] Automatic thumbnail generation
