import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import HTMLFlipBook from "react-pageflip";
import { FaSearchPlus as ZoomIn, FaSearchMinus as ZoomOut, FaHome as Home, FaExpand as Fullscreen, FaChevronLeft as ChevronLeft, FaChevronRight as ChevronRight } from 'react-icons/fa';
import { debounce } from "lodash";
import "./pdf.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfViewer = ({ file, coverImage }) => {
  const [numPages, setNumPages] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isMiddlePage, setIsMiddlePage] = useState(false);
  const [bookReady, setBookReady] = useState(false);
  const [pageCache, setPageCache] = useState({});
  const bookRef = useRef(null);

  // Gestion du redimensionnement de la fenêtre avec debounce
  useEffect(() => {
    const handleResize = debounce(() => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Gestion du plein écran
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenEnabled) {
        console.warn("Le mode plein écran n'est pas supporté par ce navigateur.");
        return;
      }

      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      } else {
        await document.exitFullscreen();
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    } catch (err) {
      console.error('Erreur lors de la gestion du plein écran:', err);
    }
  };

  // Fonction pour rendre une page du PDF avec cache
  const renderPage = useCallback(async (page, index) => {
    if (pageCache[index]) {
      setPages((prevPages) => {
        const newPages = [...prevPages];
        newPages[index] = pageCache[index];
        return newPages;
      });
      return;
    }

    try {
      const viewport = page.getViewport({ scale: zoomLevel });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport }).promise;

      const imageData = canvas.toDataURL(); // Convertir en image

      setPages((prevPages) => {
        const newPages = [...prevPages];
        newPages[index] = imageData;
        return newPages;
      });

      setPageCache((prevCache) => ({
        ...prevCache,
        [index]: imageData,
      }));
    } catch (err) {
      console.error(`Erreur lors du rendu de la page ${index + 1}:`, err);
      setPages((prevPages) => {
        const newPages = [...prevPages];
        newPages[index] = null; // Page en erreur
        return newPages;
      });
    }
  }, [zoomLevel, pageCache]);

  // Charger le PDF avec chargement progressif
  useEffect(() => {
    const loadPdf = async () => {
      if (!file) return;

      setLoading(true);
      setError(null);
      setBookReady(false);

      try {
        const loadingTask = pdfjsLib.getDocument(file);
        const pdf = await loadingTask.promise;

        setNumPages(pdf.numPages);
        setPages(new Array(pdf.numPages).fill(null));

        // Charger les premières pages immédiatement
        const initialPagesToLoad = 3; // Nombre de pages à charger initialement
        for (let i = 0; i < initialPagesToLoad; i++) {
          const page = await pdf.getPage(i + 1);
          await renderPage(page, i);
        }

        // Marquer le livre comme prêt pour l'affichage initial
        setBookReady(true);

        // Charger les pages restantes en arrière-plan
        for (let i = initialPagesToLoad; i < pdf.numPages; i++) {
          const page = await pdf.getPage(i + 1);
          await renderPage(page, i);
        }
      } catch (err) {
        console.error('Erreur lors du chargement du PDF:', err);
        setError('Impossible de charger le PDF. Veuillez vérifier le fichier et réessayer.');
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [file, renderPage]);

  // Recharger les pages lors du changement de zoom
  useEffect(() => {
    const reloadPagesWithNewZoom = async () => {
      if (!file || !numPages) return;

      setBookReady(false); // Masquer le livre pendant le rechargement

      try {
        const loadingTask = pdfjsLib.getDocument(file);
        const pdf = await loadingTask.promise;

        // Recharger toutes les pages avec le nouveau zoom
        const pagePromises = [];
        for (let i = 0; i < pdf.numPages; i++) {
          const pagePromise = pdf.getPage(i + 1)
            .then(page => renderPage(page, i))
            .catch(err => {
              console.error(`Erreur lors du rechargement de la page ${i + 1}:`, err);
            });

          pagePromises.push(pagePromise);
        }

        await Promise.allSettled(pagePromises);
        setBookReady(true); // Rendre le livre visible à nouveau
      } catch (err) {
        console.error('Erreur lors du rechargement des pages:', err);
      }
    };

    // Ne recharger les pages que si le PDF a déjà été chargé une première fois
    if (numPages > 0) {
      reloadPagesWithNewZoom();
    }
  }, [zoomLevel, file, numPages, renderPage]);

  // Gestion du zoom
  const handleZoomIn = () => {
    if (zoomLevel < 3) {
      setZoomLevel(prev => prev + 0.2);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 0.8) {
      setZoomLevel(prev => prev - 0.2);
    }
  };

  // Navigation entre les pages
  const nextPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipNext();
    }
  };

  const prevPage = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flipPrev();
    }
  };

  const goToHome = () => {
    if (bookRef.current) {
      bookRef.current.pageFlip().flip(0);
    }
  };

  const onFlip = (e) => {
    setCurrentPage(e.data);
  };

  // Style de page pour simuler un livre réel
  const renderPageContent = (pageIndex) => {
    if (pageIndex === 0 && coverImage) {
      // Cover page
      return (
        <div className="page-content">
          <img src={coverImage} alt="Couverture" className="cover-image"/>
        </div>
      );
    }

    return (
      <div className="page-content">
        {pages[pageIndex] ? (
          <img src={pages[pageIndex]} alt={`Page ${pageIndex + 1}`} className="pdf-page" />
        ) : (
          <div className="loading-page">
            <div className="loading-spinner"></div>
            <p>Chargement...</p>
          </div>
        )}
        <div className="page-number">{pageIndex + 1}</div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="pdf-error">
        <h3>Erreur</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container">
      <div className="pdf-container">
        {loading || !bookReady ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Chargement du document...</p>
          </div>
        ) : (
          <HTMLFlipBook
            ref={bookRef}
            width={Math.min(dimensions.width * 0.9, 1200)}
            height={Math.min(dimensions.height * 0.9, 2500)}
            size="stretch"
            minWidth={400}
            maxWidth={dimensions.width * 0.95}
            minHeight={600}
            maxHeight={dimensions.height * 0.95}
            showCover={true}
            mobileScrollSupport={true}
            className="flipbook"
            onFlip={onFlip}
            maxShadowOpacity={0.7}
            showPageCorners={true}
            disableFlipByClick={false}
            swipeDistance={30}
            clickEventForward={true}
            usePortrait={true}
            startZIndex={0}
            autoSize={true}
            flippingTime={1200}
            drawShadow={true}
            perspective={2000}
            style={{ overflow: "hidden" }}
          >
            {pages.map((_, index) => (
              <div key={index} className="page open">
                {renderPageContent(index)}
              </div>
            ))}
          </HTMLFlipBook>
        )}
      </div>

      {bookReady && (
        <div className="controls">
          <button onClick={prevPage} className="control-button">
            <ChevronLeft />
          </button>
          <button onClick={nextPage} className="control-button">
            <ChevronRight />
          </button>
          <span className="page-info">
            {currentPage + 1} / {numPages || "?"}
          </span>
          <button onClick={handleZoomIn} className="control-button">
            <ZoomIn />
          </button>
          <button onClick={handleZoomOut} className="control-button">
            <ZoomOut />
          </button>
          <button onClick={goToHome} className="control-button">
            <Home />
          </button>
          <button onClick={toggleFullscreen} className="control-button">
            <Fullscreen />
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;