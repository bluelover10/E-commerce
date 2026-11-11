import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import api from "../services/api";

function Reviews({ productId }) {
  const { user, token } = useContext(AuthContext);
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    rating: 5,
    title: "",
    comment: ""
  });

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reviews/product/${productId}`);
      // Backend returns { reviews, total } — support both array and object shapes
      const data = response.data;
      setReviews(Array.isArray(data) ? data : data.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login to submit a review", "error");
      return;
    }

    try {
      await api.post(
        "/reviews",
        {
          productId,
          ...formData
        }
      );
      showToast("Review submitted successfully!", "success");
      setFormData({
        rating: 5,
        title: "",
        comment: ""
      });
      setShowForm(false);
      fetchReviews();
    } catch (error) {
      console.error("Failed to submit review:", error);
      showToast(error.response?.data?.message || "Failed to submit review", "error");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Submit Review Button */}
      {user && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Write a Review
            </button>
          ) : (
            <form onSubmit={handleSubmitReview} className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4">Share your thoughts</h3>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({...formData, rating: star})}
                      className={`text-3xl ${
                        star <= formData.rating ? "text-yellow-500" : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Title</label>
                <input
                  type="text"
                  placeholder="Sum up your experience"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Comment</label>
                <textarea
                  placeholder="Share your experience with this product"
                  value={formData.comment}
                  onChange={(e) => setFormData({...formData, comment: e.target.value})}
                  required
                  rows="4"
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  Submit Review
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      rating: 5,
                      title: "",
                      comment: ""
                    });
                  }}
                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <p>Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-600">No reviews yet. Be the first to review!</p>
        ) : (
          reviews.map(review => (
            <div key={review._id} className="border-b pb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">{review.userName}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <span
                          key={star}
                          className={star <= review.rating ? "text-yellow-500" : "text-gray-300"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    {review.verified && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        Verified Purchase
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>

              <h4 className="font-semibold mb-2">{review.title}</h4>
              <p className="text-gray-700 mb-3">{review.comment}</p>

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {review.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Review ${idx}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                  ))}
                </div>
              )}

              <button
                onClick={async () => {
                  try {
                    await api.post(`/reviews/${review._id}/helpful`);
                    setReviews((prev) =>
                      prev.map((r) =>
                        r._id === review._id ? { ...r, helpful: (r.helpful || 0) + 1 } : r
                      )
                    );
                  } catch (err) {
                    console.error("Failed to mark helpful:", err);
                  }
                }}
                className="text-sm text-gray-600 hover:text-blue-600"
              >
                👍 Helpful ({review.helpful || 0})
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Reviews;
