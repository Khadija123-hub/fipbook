//import PdfViewer from "./components/PdfViewer";
import samplePdf from "./pdf/Brochure_Refrigair.pdf"; 
import PdfViewer from "./components/pdf";

function App() {
  return (
    <div>
      
      <PdfViewer file={samplePdf} style={{ width: '200px', height: '100vh' }} className="pdf-viewer" />
    </div>
  );
}

export default App;
