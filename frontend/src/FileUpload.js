import React, { useState } from "react";
import axios from "axios";
import { File } from "lucide-react"; // Importation de l'icône de fichier de Lucide

function FileUpload() {
  const [file, setFile] = useState(null);
  const [occurence, setOccurence] = useState(null);
  const [fileName, setFileName] = useState(""); // État pour stocker le nom du fichier
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleOccurence = (event) => {
    setOccurence(event.target.value);
  };
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFile(file);
    setFileName(file.name); // Mettre à jour le nom du fichier lors du changement
  };

  const handleUpload = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("occurence", occurence);
    const url =
      occurence != null
        ? "http://localhost:3001/second"
        : "http://localhost:3001/upload";

    console.log(url, occurence);
    const res = await axios
      .post(url, formData)
      .then((response) => {
        setResults(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        setErrors("Error uploading file:", error);
        setLoading(false);
      });
    console.log(res);
  };

  return (
    <div className="container">
      <div className="upload-container">
        <h1>Upload File to Hadoop</h1>
        <span className="desc">Nombre de charactère par chaine :</span>
        <input
          type="file"
          onChange={handleFileChange}
          style={{ display: "none" }}
          id="file-upload"
        />
        <input type="number" onChange={handleOccurence} id="occurence" />
        <label htmlFor="file-upload" className="file-input-label">
          Choisir un fichier
        </label>
        <div className="file-display">
          {fileName && (
            <>
              <File size={16} /> {fileName}
            </>
          )}
        </div>
        <button onClick={handleUpload}>
          {!loading ? "Upload" : "traitement en cours"}
        </button>
        <span>{errors}</span>
      </div>

      {results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Word</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, index) => (
              <tr key={index}>
                <td>{result.word}</td>
                <td>{result.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default FileUpload;
