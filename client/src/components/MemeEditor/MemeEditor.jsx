import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './MemeEditor.css';

const MemeEditor = ({
  template: propTemplate,
  initialTexts: propInitialTexts = [],
  onSave,
  onTemplateChange,
  showTemplateSelector = true,
  user
}) => {
  const location = useLocation();
  const [texts, setTexts] = useState([]);
  const [activeTextIndex, setActiveTextIndex] = useState(0);
  const [image, setImage] = useState(null);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingMemeId, setExistingMemeId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const memeContainerRef = useRef(null);

  const locationMemeData = location.state?.memeData;
  const template = locationMemeData?.template || propTemplate;
  const initialTexts = locationMemeData?.texts || propInitialTexts;

  const createDefaultText = (content, yPosition) => ({
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    content,
    position: {
      x: 50,
      y: yPosition
    },
    style: {
      fontFamily: 'Impact',
      fontSize: 40,
      color: '#ffffff',
      strokeColor: '#000000',
      strokeWidth: 2,
      align: 'center',
    }
  });

  useEffect(() => {
    if (!template && !locationMemeData?.imageUrl) return;

    if (locationMemeData) {
      setIsEditingExisting(true);
      setExistingMemeId(locationMemeData.memeId);
      const sanitized = locationMemeData.texts?.length
        ? locationMemeData.texts.map(text => ({
            ...text,
            position: {
              x: Number(text.position?.x) || 50,
              y: Number(text.position?.y) || 0
            }
          }))
        : [
            createDefaultText('TOP TEXT', 10),
            createDefaultText('BOTTOM TEXT', 90)
          ];
      setTexts(sanitized);
    } else if (initialTexts?.length > 0 && texts.length === 0) {
      const sanitized = initialTexts.map(text => ({
        ...text,
        position: {
          x: Number(text.position?.x) || 50,
          y: Number(text.position?.y) || 0
        }
      }));
      setTexts(sanitized);
    } else if (texts.length === 0) {
      setTexts([
        createDefaultText('TOP TEXT', 10),
        createDefaultText('BOTTOM TEXT', 90)
      ]);
    }
  }, [template, initialTexts, locationMemeData]);

  useEffect(() => {
    if (!template?.imageUrl && !locationMemeData?.imageUrl) return;

    const imageUrl = locationMemeData?.imageUrl || template.imageUrl;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      setImage(img);
    };
  }, [template?.imageUrl, locationMemeData?.imageUrl]);

  const handleTextChange = (index, field, value) => {
    setTexts(prev =>
      prev.map((text, i) => {
        if (i !== index) return text;

        const updated = { ...text };

        if (field === 'content') {
          updated.content = value;
        } else if (field === 'position') {
          updated.position = {
            ...text.position,
            [value.axis]: Number(value.value) || 0,
          };
        } else {
          updated.style = {
            ...text.style,
            [field]: value,
          };
        }

        return updated;
      })
    );
  };

  const handleAddText = () => {
    const newText = createDefaultText('NEW TEXT', 50);
    setTexts(prev => [...prev, newText]);
    setActiveTextIndex(texts.length);
  };

  const handleRemoveText = (index) => {
    if (texts.length <= 1) {
      alert('You need at least one text element');
      return;
    }
    setTexts(prev => prev.filter((_, i) => i !== index));
    setActiveTextIndex(prev => Math.min(index, prev - 1));
  };

  const drawTexts = (ctx, canvas) => {
    texts.forEach(text => {
      ctx.font = `${text.style.fontSize}px ${text.style.fontFamily}`;
      ctx.textAlign = text.style.align;
      const x = (text.position.x / 100) * canvas.width;
      const y = (text.position.y / 100) * canvas.height;

      ctx.lineWidth = text.style.strokeWidth * 2;
      ctx.strokeStyle = text.style.strokeColor;
      ctx.strokeText(text.content, x, y);

      ctx.fillStyle = text.style.color;
      ctx.fillText(text.content, x, y);
    });
  };

  const exportCanvas = (canvas, action) => {
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        try {
          if (action === 'download') {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'meme.png';
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 100);
          } else if (action === 'copy') {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            alert('Meme copied to clipboard!');
          }
          resolve(true);
        } catch (err) {
          console.error(`${action} failed:`, err);
          alert(`Failed to ${action}: ${err.message}`);
          resolve(false);
        }
      }, 'image/png');
    });
  };

  const drawImageAndExport = async (ctx, canvas, action) => {
    if (image instanceof File || image instanceof Blob) {
      const imgUrl = URL.createObjectURL(image);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawTexts(ctx, canvas);
      await exportCanvas(canvas, action);
      URL.revokeObjectURL(imgUrl);
    } else if (typeof image === 'string') {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = image.includes('?') ? `${image}&t=${Date.now()}` : `${image}?t=${Date.now()}`;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      drawTexts(ctx, canvas);
      await exportCanvas(canvas, action);
    } else if (image instanceof HTMLImageElement) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      drawTexts(ctx, canvas);
      await exportCanvas(canvas, action);
    } else {
      throw new Error('Unsupported image type');
    }
  };

  const handleDownload = async () => {
    try {
      if (!memeContainerRef.current || !image) return;

      const container = memeContainerRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await drawImageAndExport(ctx, canvas, 'download');
    } catch (err) {
      console.error('Download failed:', err);
      alert(`Failed to download: ${err.message}`);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      if (!memeContainerRef.current || !image) return;

      const container = memeContainerRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await drawImageAndExport(ctx, canvas, 'copy');
    } catch (err) {
      console.error('Copy failed:', err);
      alert(`Failed to copy: ${err.message}`);
    }
  };

  const handleSave = async () => {
  if (!user) {
    alert('Please login to save memes');
    return;
  }

  try {
    // Create a canvas to generate the meme image
    const container = memeContainerRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the image and texts
    if (image instanceof HTMLImageElement) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    
    // Draw the texts
    texts.forEach(text => {
      ctx.font = `${text.style.fontSize}px ${text.style.fontFamily}`;
      ctx.textAlign = text.style.align;
      const x = (text.position.x / 100) * canvas.width;
      const y = (text.position.y / 100) * canvas.height;

      ctx.lineWidth = text.style.strokeWidth * 2;
      ctx.strokeStyle = text.style.strokeColor;
      ctx.strokeText(text.content, x, y);

      ctx.fillStyle = text.style.color;
      ctx.fillText(text.content, x, y);
    });

    // Convert canvas to blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    // Create FormData for the API request
    const formData = new FormData();
    formData.append('image', blob, 'meme.png');
    formData.append('templateId', template?._id || 'uploaded');
    formData.append('texts', JSON.stringify(texts));
    
    if (isEditingExisting && existingMemeId) {
      formData.append('memeId', existingMemeId);
    }

    // Make API request to save the meme
    const response = await fetch('/api/memes/save', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to save meme');
    }

    // Call the onSave callback with the saved meme data
    if (onSave) {
      onSave({
        ...data.savedMeme,
        templateId: template?._id,
        texts,
        imageUrl: URL.createObjectURL(blob)
      });
    }

    alert('Meme saved to your collection successfully!');
  } catch (error) {
    console.error('Error saving meme:', error);
    alert(`Failed to save meme: ${error.message}`);
  }
};

  const handleMouseDown = (e, index) => {
    const container = memeContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setDragOffset({
      x: x - texts[index].position.x,
      y: y - texts[index].position.y
    });
    setIsDragging(true);
    setActiveTextIndex(index);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || activeTextIndex === null) return;

    const container = memeContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    handleTextChange(activeTextIndex, 'position', { axis: 'x', value: x - dragOffset.x });
    handleTextChange(activeTextIndex, 'position', { axis: 'y', value: y - dragOffset.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeTextIndex, dragOffset]);

  if (!template && !locationMemeData?.imageUrl) {
    return (
      <div className="loading-container">
        <p>No template selected</p>
        {onTemplateChange && (
          <button onClick={onTemplateChange} className="select-template-button">
            Select Template
          </button>
        )}
      </div>
    );
  }

   return (
    <div className="meme-editor">
      <div className="editor-header">
        <h1>{isEditingExisting ? 'Edit Your Meme' : 'Create a New Meme'}</h1>
      </div>
      
      <div className="editor-content">
        {/* Meme Display Area */}
        <div className="meme-display-container">
          <div 
            className="meme-display" 
            ref={memeContainerRef}
            style={{ backgroundImage: image ? `url(${image.src})` : 'none' }}
          >
            {texts.map((text, index) => (
              <div
                key={text.id}
                className={`meme-text ${activeTextIndex === index ? 'active' : ''}`}
                style={{
                  left: `${text.position.x}%`,
                  top: `${text.position.y}%`,
                  fontFamily: text.style.fontFamily,
                  fontSize: `${text.style.fontSize}px`,
                  color: text.style.color,
                  textShadow: `
                    ${text.style.strokeWidth}px ${text.style.strokeWidth}px 0 ${text.style.strokeColor},
                    -${text.style.strokeWidth}px -${text.style.strokeWidth}px 0 ${text.style.strokeColor},
                    ${text.style.strokeWidth}px -${text.style.strokeWidth}px 0 ${text.style.strokeColor},
                    -${text.style.strokeWidth}px ${text.style.strokeWidth}px 0 ${text.style.strokeColor}
                  `,
                  textAlign: text.style.align,
                  transform: 'translate(-50%, -50%)',
                  cursor: 'move'
                }}
                onClick={() => setActiveTextIndex(index)}
                onMouseDown={(e) => handleMouseDown(e, index)}
              >
                {text.content}
              </div>
            ))}
          </div>
          
          <div className="editor-meme-actions">
            <button
              onClick={handleDownload}
              className="editor-action-button editor-download-button"
            >
              Download Meme
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="editor-action-button copy-button"
            >
              Copy to Clipboard
            </button>
            {onSave && user && (
              <button
                onClick={handleSave}
                className="editor-action-button save-button"
                disabled={!image} // Disable if no image is loaded
              >
                {isEditingExisting ? 'Update Meme' : 'Save to My Memes'}
              </button>
            )}
          </div>
        </div>
        
        {/* Text Controls Area */}
        <div className="text-controls-container">
          <div className="controls-header">
            <h2>Text Controls</h2>
            <div className="text-actions">
              <button
                onClick={handleAddText}
                className="editor-add-button action-button "
              >
                Add Text
              </button>
              {texts.length > 0 && (
                <button
                  onClick={() => handleRemoveText(activeTextIndex)}
                  className="editor-action-button remove-button"
                  disabled={texts.length <= 1}
                >
                  Remove Text
                </button>
              )}
            </div>
          </div>
          
          {texts.length > 0 && (
            <div className="text-controls-content">
              <div className="text-content-group">
                <label>Text Content</label>
                <div className="text-input-wrapper">
                  <input
                    type="text"
                    value={texts[activeTextIndex].content}
                    onChange={(e) => handleTextChange(
                      activeTextIndex, 
                      'content', 
                      e.target.value
                    )}
                    placeholder="Enter your text here"
                  />
                  <div className="color-pickers">
                    <div className="color-picker">
                      <label>Text Color</label>
                      <input
                        type="color"
                        value={texts[activeTextIndex].style.color}
                        onChange={(e) => handleTextChange(
                          activeTextIndex, 
                          'color', 
                          e.target.value
                        )}
                      />
                    </div>
                    <div className="color-picker">
                      <label>Outline Color</label>
                      <input
                        type="color"
                        value={texts[activeTextIndex].style.strokeColor}
                        onChange={(e) => handleTextChange(
                          activeTextIndex, 
                          'strokeColor', 
                          e.target.value
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="control-group">
                <label>Font Family</label>
                <select
                  value={texts[activeTextIndex].style.fontFamily}
                  onChange={(e) => handleTextChange(
                    activeTextIndex, 
                    'fontFamily', 
                    e.target.value
                  )}
                >
                  {['Impact', 'Arial', 'Verdana', 'Comic Sans MS', 'Courier New', 'Georgia'].map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </div>
              
              <div className="control-group range-group">
                <label>
                  Font Size: <span>{texts[activeTextIndex].style.fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={texts[activeTextIndex].style.fontSize}
                  onChange={(e) => handleTextChange(
                    activeTextIndex, 
                    'fontSize', 
                    Number(e.target.value)
                  )}
                />
              </div>
              
              <div className="control-group range-group">
                <label>
                  Outline Width: <span>{texts[activeTextIndex].style.strokeWidth}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={texts[activeTextIndex].style.strokeWidth}
                  onChange={(e) => handleTextChange(
                    activeTextIndex, 
                    'strokeWidth', 
                    Number(e.target.value)
                  )}
                />
              </div>
              
              <div className="control-group">
                <label>Text Alignment</label>
                <div className="alignment-buttons">
                  <button
                    onClick={() => handleTextChange(
                      activeTextIndex, 
                      'align', 
                      'left'
                    )}
                    className={`alignment-button ${
                      texts[activeTextIndex].style.align === 'left' ? 'active' : ''
                    }`}
                  >
                    Left
                  </button>
                  <button
                    onClick={() => handleTextChange(
                      activeTextIndex, 
                      'align', 
                      'center'
                    )}
                    className={`alignment-button ${
                      texts[activeTextIndex].style.align === 'center' ? 'active' : ''
                    }`}
                  >
                    Center
                  </button>
                  <button
                    onClick={() => handleTextChange(
                      activeTextIndex, 
                      'align', 
                      'right'
                    )}
                    className={`alignment-button ${
                      texts[activeTextIndex].style.align === 'right' ? 'active' : ''
                    }`}
                  >
                    Right
                  </button>
                </div>
              </div>
              
              <div className="position-controls">
                <h3>Position</h3>
                <div className="position-inputs">
                  <div className="position-input">
                    <label>Horizontal: {Math.round(texts[activeTextIndex].position.x)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={texts[activeTextIndex].position.x}
                      onChange={(e) => handleTextChange(
                        activeTextIndex, 
                        'position', 
                        {
                          axis: 'x',
                          value: e.target.value
                        }
                      )}
                    />
                  </div>
                  <div className="position-input">
                    <label>Vertical: {Math.round(texts[activeTextIndex].position.y)}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={texts[activeTextIndex].position.y}
                      onChange={(e) => handleTextChange(
                        activeTextIndex, 
                        'position', 
                        {
                          axis: 'y',
                          value: e.target.value
                        }
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {showTemplateSelector && onTemplateChange && (
            <div className="template-controls">
              <h3>Template Options</h3>
              <button
                onClick={onTemplateChange}
                className="editor-action-button template-button"
              >
                Change Template
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemeEditor;
