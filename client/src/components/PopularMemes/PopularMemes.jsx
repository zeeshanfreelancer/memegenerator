import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPopularMemes, clearMemeError } from '../features/memes/memeSlice';
import MemeCard from './MemeCard';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import './PopularMemes.css';

function PopularMemes() {
  const dispatch = useDispatch();
  const { popularMemes, status, error } = useSelector((state) => state.memes);

  useEffect(() => {
    dispatch(fetchPopularMemes());
    return () => dispatch(clearMemeError());
  }, [dispatch]);

  const handleDismissError = () => dispatch(clearMemeError());

  if (status === 'loading') return <LoadingSpinner />;
  if (status === 'failed') return <ErrorMessage error={error} onDismiss={handleDismissError} />;

  return (
    <div className="popular-memes-container">
      <h1 className="popular-memes-title">Popular Memes</h1>
      <div className="memes-grid">
        {popularMemes.map((meme) => (
          <MemeCard key={meme._id} meme={meme} />
        ))}
      </div>
    </div>
  );
}

export default PopularMemes;