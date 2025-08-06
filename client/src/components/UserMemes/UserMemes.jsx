import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUserMemes, createMeme } from '../features/memes/memeSlice';
import MemeForm from './MemeForm';
import './UserMemes.css';

function UserMemes() {
  const dispatch = useDispatch();
  const { userMemes, status } = useSelector((state) => state.memes);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user) dispatch(fetchUserMemes());
  }, [dispatch, user]);

  const handleCreateMeme = async (memeData) => {
    try {
      await dispatch(createMeme(memeData)).unwrap();
    } catch (error) {
      console.error('Meme creation failed:', error);
    }
  };

  return (
    <div className="user-memes-container">
      <h2 className="user-memes-title">Your Memes</h2>
      
      <MemeForm onSubmit={handleCreateMeme} />
      
      {status === 'loading' ? (
        <div className="loading-message">Loading your memes...</div>
      ) : (
        <div className="user-memes-list">
          {userMemes.map((meme) => (
            <div key={meme._id} className="meme-item">
              <img src={meme.imageUrl} alt={meme.texts?.join(' ')} className="meme-image" />
              <div className="meme-actions">
                <span className="likes-count">{meme.likesCount} likes</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserMemes;