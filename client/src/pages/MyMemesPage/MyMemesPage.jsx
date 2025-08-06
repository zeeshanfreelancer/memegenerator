import { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserMemes, deleteMeme } from '../../store/memeSlice';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaShare, FaSpinner } from 'react-icons/fa';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import './MyMemesPage.css';

const MyMemesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { userMemes, status, error } = useSelector((state) => state.memes);
  const { user } = useSelector((state) => state.auth);
  const [visibleMemes, setVisibleMemes] = useState(12);
  const [deletingId, setDeletingId] = useState(null);

  // Memoized fetch function
  const fetchMemes = useCallback(() => {
    if (user) {
      dispatch(fetchUserMemes())
        .unwrap()
        .catch(error => {
          toast.error(error?.message || 'Failed to load your memes');
          console.error('Fetch error:', error);
        });
    }
  }, [dispatch, user]);

  useEffect(() => {
    fetchMemes();
  }, [fetchMemes]);

const handleEditMeme = (meme) => {
  // Navigate directly to the meme editor with the existing meme data
  navigate(`/memeeditor`, {
    state: {
      memeData: {
        imageUrl: meme.imageUrl,       // The existing meme image
        texts: meme.texts || [],       // Existing text layers
        styles: meme.styles || {},     // Existing styles
        memeId: meme._id,              // For updating existing meme
        template: meme.template        // Template data if available
      }
    }
  });
};

  const handleDeleteMeme = (memeId) => {
    confirmAlert({
      title: 'Delete Meme',
      message: 'Are you sure you want to delete this meme?',
      buttons: [
        {
          label: 'Yes',
          onClick: async () => {
            try {
              setDeletingId(memeId);
              await dispatch(deleteMeme(memeId)).unwrap();
              toast.success('Meme deleted successfully');
              fetchMemes(); // Refresh the list
            } catch (err) {
              toast.error(err?.message || 'Failed to delete meme');
              console.error('Delete error:', err);
            } finally {
              setDeletingId(null);
            }
          }
        },
        {
          label: 'No',
          onClick: () => {}
        }
      ]
    });
  };

  const handleShareMeme = (meme) => {
    navigator.clipboard.writeText(meme.imageUrl)
      .then(() => toast.success('Meme URL copied to clipboard!'))
      .catch(() => toast.error('Failed to copy URL'));
  };

  const loadMoreMemes = () => {
    setVisibleMemes(prev => prev + 12);
  };

  if (!user) {
    return (
      <div className="auth-required">
        <h2>Please login to view your memes</h2>
        <p>Sign in to access your saved meme creations</p>
        <div className="auth-actions">
          <Link to="/login" className="login-button">Login</Link>
          <Link to="/register" className="register-button">Create Account</Link>
        </div>
      </div>
    );
  }

  if (status === 'loading' && userMemes.length === 0) {
    return (
      <div className="loading-state">
        <FaSpinner className="spinner" />
        <p>Loading your memes...</p>
      </div>
    );
  }

  if (error && userMemes.length === 0) {
    return (
      <div className="error-state">
        <h2>Error loading memes</h2>
        <p>{error.message || 'Something went wrong'}</p>
        <div className="error-actions">
          <button 
            onClick={fetchMemes}
            className="retry-button"
          >
            Try Again
          </button>
          <Link to="/" className="home-button">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="my-memes-container">
      <div className="my-memes-header">
        <h1>My Memes</h1>
        <Link to="/templates" className="create-new-button">
          Create New Meme
        </Link>
      </div>
      
      {userMemes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-content">
            <h2>Your meme collection is empty</h2>
            <p>Start creating hilarious memes to see them here</p>
            <Link to="/templates" className="create-button">
              Create Your First Meme
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="meme-grid">
            {userMemes.slice(0, visibleMemes).map((meme) => (
              <div key={meme._id} className="meme-card">
                <div className="meme-image-container">
                  <img 
                    src={meme.imageUrl} 
                    alt={`Your meme: ${meme.template?.name || 'Custom Meme'}`}
                    className="meme-image" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-meme.png';
                    }}
                  />
                  <div className="meme-overlay">
                    <div className="meme-info">
                      <h3>{meme.template?.name || 'Custom Meme'}</h3>
                      <p>Created: {new Date(meme.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="meme-actions">
                  <button 
                    onClick={() => handleEditMeme(meme)}
                    className="action-button edit-button"
                    title="Edit this meme"
                  >
                    <FaEdit />
                  </button>
                  <button 
                    onClick={() => handleShareMeme(meme)}
                    className="action-button share-button"
                    title="Share this meme"
                  >
                    <FaShare />
                  </button>
                  <button 
                    onClick={() => handleDeleteMeme(meme._id)}
                    className="action-button delete-button"
                    title="Delete this meme"
                    disabled={deletingId === meme._id}
                  >
                    {deletingId === meme._id ? <FaSpinner className="spinner" /> : <FaTrash />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {visibleMemes < userMemes.length && (
            <div className="load-more-container">
              <button 
                onClick={loadMoreMemes}
                className="load-more-button"
              >
                Load More ({userMemes.length - visibleMemes} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyMemesPage;