import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";
import HTMLFlipBook from "react-pageflip";
import { ClipLoader } from "react-spinners";
import { FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus, FaHome, FaExpand } from "react-icons/fa";
import "./PdfViewer.css";

// Définir l'URL du worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfViewer = ({ file }) => {
  const [numPages, setNumPages] = useState(null);
  const [pages, setPages] = useState([]); // Stocke les pages rendues
  const [dimensions, setDimensions] = useState({ width: 700, height: 800 });
  const [currentPage, setCurrentPage] = useState(0); // Page actuelle
  const [loading, setLoading] = useState(true); // État de chargement
  const flipBookRef = useRef(null); // Référence pour le flipbook

  // Adapter la taille en fonction de l'écran
  useEffect(() => {
    const updateSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      setDimensions({
        width: screenWidth,
        height: screenHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Fonction pour rendre une page du PDF
  const renderPage = useCallback((page, index) => {
    const viewport = page.getViewport({ scale: 1.2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    page.render({ canvasContext: context, viewport }).promise.then(() => {
      setPages((prevPages) => {
        const newPages = [...prevPages];
        newPages[index] = canvas.toDataURL(); // Convertir en image
        return newPages;
      });
    });
  }, []);

  // Charger le PDF
  useEffect(() => {
    const loadingTask = pdfjsLib.getDocument(file);
    loadingTask.promise.then((pdf) => {
      setNumPages(pdf.numPages);
      setPages(new Array(pdf.numPages).fill(null));

      for (let i = 0; i < pdf.numPages; i++) {
        pdf.getPage(i + 1).then((page) => renderPage(page, i));
      }
      setLoading(false); // Fin du chargement
    });
  }, [file, renderPage]);

  // Fonctions de navigation
  const nextPage = () => {
    if (currentPage < numPages - 1) {
      setCurrentPage(currentPage + 1);
      flipBookRef.current.pageFlip().flipNext();
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      flipBookRef.current.pageFlip().flipPrev();
    }
  };

  // Fonctions de zoom (à implémenter)
  const handleZoomIn = () => {
    console.log("Zoom In");
  };

  const handleZoomOut = () => {
    console.log("Zoom Out");
  };

  // Aller à la première page
  const goToHome = () => {
    setCurrentPage(0);
    flipBookRef.current.pageFlip().flip(0);
  };

  // Basculer en plein écran
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="pdf-container">
      {loading ? (
        <div className="loading-spinner">
          <ClipLoader color="#36d7b7" size={50} />
          <p>Chargement du PDF...</p>
        </div>
      ) : (
        <>
          <div className="flip-book-container">
            <HTMLFlipBook
              ref={flipBookRef}
              width={dimensions.width}
              height={dimensions.height}
              onFlip={(e) => setCurrentPage(e.data)}
            >
              {pages.map((page, index) => (
                <div key={index} className="page">
                  {page ? (
                    <img src={page} alt={`Page ${index + 1}`} className="pdf-page" />
                  ) : (
                    <p>Chargement...</p>
                  )}
                </div>
              ))}
            </HTMLFlipBook>
          </div>
          <div className="controls">
            <button onClick={prevPage} className="control-button">
              <FaChevronLeft />
            </button>
            <button onClick={nextPage} className="control-button">
              <FaChevronRight />
            </button>
            <span className="page-info">
              {currentPage + 1} / {numPages || "?"}
            </span>
            <button onClick={handleZoomIn} className="control-button">
              <FaSearchPlus />
            </button>
            <button onClick={handleZoomOut} className="control-button">
              <FaSearchMinus />
            </button>
            <button onClick={goToHome} className="control-button">
              <FaHome />
            </button>
            <button onClick={toggleFullscreen} className="control-button">
              <FaExpand />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default PdfViewer;