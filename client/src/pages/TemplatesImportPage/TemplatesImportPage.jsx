import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchTemplates } from '../../store/templateSlice';
import { toast } from 'react-toastify';
import './TemplatesImportPage.css';

const TemplatesPage = () => {
  const dispatch = useDispatch();
  const templatesSlice = useSelector((state) => state.templates);
const templates = templatesSlice.templates || [];
const status = templatesSlice.status;

  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const categories = [
    'All',
    'Popular',
    'Animals',
    'Movies',
    'TV Shows',
    'Celebrities',
    'Gaming',
    'Anime',
    'Funny',
    'Politics',
  ];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(fetchTemplates({ search: debouncedSearch, category }))
      .unwrap()
      .catch(error => {
        toast.error('Failed to load templates');
        console.error('Fetch error:', error);
      });
  }, [dispatch, debouncedSearch, category]);

  const handleTagClick = (tag) => {
    setSearchTerm(tag);
  };

  if (status === 'loading') {
    return <div className="loading-spinner">Loading templates...</div>;
  }

  return (
    <div className="templates-container">
      <div className="templates-header">
        <h1>Meme Templates</h1>
        
        <div className="search-filters">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="category-filter">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value === 'All' ? '' : e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {templates.length === 0 ? (
        <div className="empty-state">
          <p>No templates found matching your search.</p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setCategory('');
            }}
            className="reset-button"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="template-grid">
          {templates.map((template) => (
            <div key={template._id} className="template-card">
              <Link to={`/create/${template._id}`}>
                <img 
                  src={template.imageUrl} 
                  alt={template.name} 
                  className="template-image"
                />
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <div className="template-tags">
                    {template.tags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag} 
                        className="tag"
                        onClick={(e) => {
                          e.preventDefault();
                          handleTagClick(tag);
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;