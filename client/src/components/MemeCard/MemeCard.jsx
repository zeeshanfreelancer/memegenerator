import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { likeMeme } from '../features/memes/memeSlice';
import './MemeCard.css';

function MemeCard({ meme }) {
  const dispatch = useDispatch();
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    setIsLiking(true);
    try {
      await dispatch(likeMeme(meme._id)).unwrap();
    } catch (error) {
      console.error('Failed to like meme:', error);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="meme-card">
      <img 
        src={meme.imageUrl} 
        alt={meme.texts?.join(' ')} 
        className="meme-card-image"
      />
      <div className="meme-card-content">
        <div className="meme-card-footer">
          <span className="meme-likes">
            {meme.likesCount} {meme.likesCount === 1 ? 'like' : 'likes'}
          </span>
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`like-button ${isLiking ? 'liking' : ''}`}
          >
            {isLiking ? '...' : '❤️ Like'}
          </button>
        </div>
        {meme.user?.username && (
          <p className="meme-author">
            By: {meme.user.username}
          </p>
        )}
      </div>
    </div>
  );
}

export default MemeCard;