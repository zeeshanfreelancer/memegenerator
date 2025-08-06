import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { createMeme } from '../../store/memeSlice';
import { fetchTemplates } from '../../store/templateSlice';
import { Stage, Layer, Image as KonvaImage, Text } from 'react-konva';
import {
  FaDownload, FaFont, FaAlignLeft, FaAlignCenter, FaAlignRight
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import './MemeGenerator.css';

const MemeGenerator = () => {
  const { templateId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { templates, status: templatesStatus } = useSelector((state) => state.templates);
  const { user } = useSelector((state) => state.auth);
  const stageRef = useRef(null);

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [texts, setTexts] = useState([]);
  const [activeTextIndex, setActiveTextIndex] = useState(0);
  const [image, setImage] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 500 });

useEffect(() => {
  if (selectedTemplate?.imageUrl) {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedTemplate.imageUrl;
    img.onload = () => {
      setImage(img);
      
      // Calculate aspect ratio and scale to fit 500x500 container
      const maxWidth = 500;
      const maxHeight = 500;
      let width = img.width;
      let height = img.height;

      // Calculate the scaling factor to fit within 500x500
      const scale = Math.min(
        maxWidth / width,
        maxHeight / height
      );

      // Set the canvas size to maintain aspect ratio
      setCanvasSize({
        width: width * scale,
        height: height * scale,
      });
    };
  }
}, [selectedTemplate]);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  useEffect(() => {
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t._id === templateId);
      if (template) {
        setSelectedTemplate(template);
        setTexts([
          {
            content: 'TOP TEXT',
            position: { x: template.width / 2 || 100, y: 20 },
            style: {
              fontFamily: 'Impact',
              fontSize: 40,
              fill: '#ffffff',
              stroke: '#000000',
              strokeWidth: 2,
              align: 'center',
            },
          },
          {
            content: 'BOTTOM TEXT',
            position: { x: template.width / 2 || 100, y: template.height - 40 || 400 },
            style: {
              fontFamily: 'Impact',
              fontSize: 40,
              fill: '#ffffff',
              stroke: '#000000',
              strokeWidth: 2,
              align: 'center',
            },
          },
        ]);
      }
    }
  }, [templateId, templates]);

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


  const handleDownload = useCallback(() => {
    try {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'meme.png';
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Meme downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download meme');
      console.error('Download error:', error);
    }
  }, []);

  const handleSaveMeme = useCallback(() => {
    if (!user) {
      toast.error('Please login to save memes');
      navigate('/login');
      return;
    }

    if (!selectedTemplate) {
      toast.error('No template selected');
      return;
    }

    const memeData = {
      templateId: selectedTemplate._id,
      texts,
      styles: {
        width: selectedTemplate.width,
        height: selectedTemplate.height,
      },
    };

    dispatch(createMeme(memeData))
      .unwrap()
      .then(() => toast.success('Meme saved successfully!'))
      .catch((error) => {
        toast.error('Failed to save meme');
        console.error('Save error:', error);
      });
  }, [dispatch, navigate, selectedTemplate, texts, user]);

  const addTextLayer = useCallback(() => {
    setTexts(prev => [
      ...prev,
      {
        content: 'NEW TEXT',
        position: { x: selectedTemplate?.width / 2 || 100, y: selectedTemplate?.height / 2 || 100 },
        style: {
          fontFamily: 'Impact',
          fontSize: 40,
          fill: '#ffffff',
          stroke: '#000000',
          strokeWidth: 2,
          align: 'center',
        },
      }
    ]);
    setActiveTextIndex(texts.length);
  }, [selectedTemplate, texts.length]);

  if (templatesStatus === 'loading') {
    return <div className="loading-spinner">Loading templates...</div>;
  }

  if (!selectedTemplate || !image) {
    return <TemplateSelector templates={templates} />;
  }

  return (
    <div className="meme-generator-container">
      <div className="canvas-section">
        <div className="canvas-wrapper">
          <Stage
            ref={stageRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="meme-canvas"
            scaleX={canvasSize.width / (selectedTemplate?.width || 500)}
            scaleY={canvasSize.height / (selectedTemplate?.height || 500)}
          >
            <Layer>
              <KonvaImage 
                image={image} 
                width={selectedTemplate?.width || 500} 
                height={selectedTemplate?.height || 500} 
              />
              {texts.map((text, index) => (
                <Text
                  key={index}
                  x={text.position.x || 0}
                  y={text.position.y || 0}
                  text={text.content || ''}
                  fontFamily={text.style.fontFamily}
                  fontSize={text.style.fontSize || 24}
                  fill={text.style.fill}
                  stroke={text.style.stroke}
                  strokeWidth={text.style.strokeWidth}
                  align={text.style.align}
                  draggable
                  onDragEnd={(e) =>
                    handleTextChange(index, 'position', {
                      x: e.target.x(),
                      y: e.target.y(),
                    })
                  }
                  onClick={() => setActiveTextIndex(index)}
                  shadowColor={activeTextIndex === index ? 'rgba(0,0,255,0.5)' : undefined}
                  shadowBlur={activeTextIndex === index ? 10 : 0}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        <div className="action-buttons">
          <button onClick={handleDownload} className="download-button">
            <FaDownload /> Download
          </button>
          {user && (
            <button onClick={handleSaveMeme} className="save-button">
              Save Meme
            </button>
          )}
          <button onClick={addTextLayer} className="add-text-button">
            <FaFont /> Add Text Layer
          </button>
        </div>
      </div>

      <div className="controls-section">
        {texts.length > 0 && (
          <div className="text-controls">
            <h3>Text Controls</h3>
            <div className="control-group">
              <label>Text Content</label>
              <input
                type="text"
                value={texts[activeTextIndex].content}
                onChange={(e) => handleTextChange(activeTextIndex, 'content', e.target.value)}
              />
            </div>

            <div className="control-group">
              <label>Font Family</label>
              <select
                value={texts[activeTextIndex].style.fontFamily}
                onChange={(e) => handleTextChange(activeTextIndex, 'fontFamily', e.target.value)}
              >
                <option value="Impact">Impact</option>
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Comic Sans MS">Comic Sans</option>
              </select>
            </div>

            <div className="control-group">
              <label>Font Size: {texts[activeTextIndex].style.fontSize}px</label>
              <input
                type="range"
                min="10"
                max="100"
                value={texts[activeTextIndex].style.fontSize}
                onChange={(e) =>
                  handleTextChange(activeTextIndex, 'fontSize', parseInt(e.target.value))
                }
              />
            </div>

            <div className="color-controls">
              <div className="color-picker">
                <label>Text Color</label>
                <input
                  type="color"
                  value={texts[activeTextIndex].style.fill}
                  onChange={(e) => handleTextChange(activeTextIndex, 'fill', e.target.value)}
                />
              </div>
              <div className="color-picker">
                <label>Outline Color</label>
                <input
                  type="color"
                  value={texts[activeTextIndex].style.stroke}
                  onChange={(e) => handleTextChange(activeTextIndex, 'stroke', e.target.value)}
                />
              </div>
            </div>

            <div className="alignment-controls">
              <button
                onClick={() => handleTextChange(activeTextIndex, 'align', 'left')}
                className={texts[activeTextIndex].style.align === 'left' ? 'active' : ''}
              >
                <FaAlignLeft />
              </button>
              <button
                onClick={() => handleTextChange(activeTextIndex, 'align', 'center')}
                className={texts[activeTextIndex].style.align === 'center' ? 'active' : ''}
              >
                <FaAlignCenter />
              </button>
              <button
                onClick={() => handleTextChange(activeTextIndex, 'align', 'right')}
                className={texts[activeTextIndex].style.align === 'right' ? 'active' : ''}
              >
                <FaAlignRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TemplateSelector = ({ templates }) => (
  <div className="template-selector">
    <h2>Select a Template</h2>
    <div className="template-grid">
      {templates.map(template => (
        <div key={template._id} className="template-card">
          <img src={template.imageUrl} alt={template.name} />
          <h3>{template.name}</h3>
        </div>
      ))}
    </div>
  </div>
);

export default MemeGenerator;
