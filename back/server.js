const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const cors = require("cors");
const fs = require("fs");

// Configuration de Multer pour stocker les fichiers dans un dossier 'uploads'
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

const app = express();
app.use(cors());

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  const filename = req.file.filename;

  const localPath =
    "/mnt/c/Users/theom/git/big-data-project/back/uploads/" + filename;
  const hdfsPath = `/input`;

  // Exécuter la commande dans WSL pour mettre le fichier dans HDFS avec -copyFromLocal
  const put = spawn("wsl", [
    "/usr/local/hadoop/bin/hadoop",
    "fs",
    "-rm",
    "-r",
    "/output",
    "&&",
    "/usr/local/hadoop/bin/hdfs",
    "dfs",
    "-copyFromLocal",
    "-f",
    localPath,
    hdfsPath,
    "&&",
    "/usr/local/hadoop/bin/hadoop",
    "jar",
    "/usr/local/hadoop/share/hadoop/mapreduce/hadoop-mapreduce-examples-3.2.1.jar",
    "wordcount",
    `/input/${filename}`,
    `/output`,
    "&&",
    "/usr/local/hadoop/bin/hdfs",
    "dfs",
    "-cat",
    `/usr/local/hadoop/output/part-r-00000`,
    "&&",
    "/usr/local/hadoop/bin/hdfs",
    "dfs",
    "-copyToLocal",
    "-f",
    "/output/part-r-00000",
    "output/result.txt",
  ]);

  put.stdout.pipe(process.stdout);
  put.stderr.pipe(process.stderr);
  put.stdin.end();

  put.on("close", (code) => {
    if (code !== 0) {
      console.error(`Process exited with code ${code}`);
      return res.status(500).send("Failed to process the file.");
    }

    // Lire et formatter les résultats une fois le processus terminé
    try {
      const results = fs
        .readFileSync("output/result.txt", "utf8")
        .split("\n")
        .filter((line) => line.trim()) // Filtre les lignes vides
        .map((line) => {
          const [word, count] = line.split("\t");
          return { word, count: parseInt(count, 10) }; // Parse count comme un entier
        })
        .sort((a, b) => b.count - a.count); // Trier les résultats par 'count' décroissant

      // Suppression du fichier de résultat pour éviter l'accumulation de données
      fs.unlinkSync("output/result.txt");
      res.json(results);
    } catch (err) {
      console.error(`Error reading the results file: ${err}`);
      res.status(500).send("Could not read the results file.");
    }
  });
});

app.post("/second", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  const fileParse = "data_parse.txt";
  const filename = req.file.filename;
  const filePath = req.file.path; // Chemin du fichier uploadé
  const spacing = parseInt(req.body.occurence);

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the file:", err);
      return res.status(500).send("Error reading the file.");
    }
    const lines = data.split("\n").slice(1);

    let allData = lines.join("");
    let formattedData = "";
    for (let i = 0; i < allData.length; i += spacing) {
      formattedData += allData.substring(i, i + spacing) + " ";
    }

    fs.writeFile(`uploads/${fileParse}`, formattedData, (err) => {});
  });

  const localPath =
    "/mnt/c/Users/theom/git/big-data-project/back/uploads/" + "data_parse.txt";
  const hdfsPath = `/input`;

  // Exécuter la commande dans WSL pour mettre le fichier dans HDFS avec -copyFromLocal
  const put = spawn("wsl", [
    "/usr/local/hadoop/bin/hdfs",
    "dfs",
    "-rm",
    "-r",
    "/output",
    "&&",
    "/usr/local/hadoop/bin/hdfs",
    "dfs",
    "-copyFromLocal",
    "-f",
    localPath,
    hdfsPath,
    "&&",
    "/usr/local/hadoop/bin/hadoop",
    "jar",
    "/usr/local/hadoop/share/hadoop/mapreduce/hadoop-mapreduce-examples-3.2.1.jar",
    "wordcount",
    `/input/data_parse.txt`,
    `/output`,
    "&&",
    "/usr/local/hadoop/bin/hdfs",
    "dfs",
    "-copyToLocal",
    "-f",
    "/output/part-r-00000",
    "output/result.txt",
  ]);

  put.stdout.pipe(process.stdout);
  put.stderr.pipe(process.stderr);
  put.stdin.end();

  put.on("close", (code) => {
    if (code !== 0) {
      console.error(`Process exited with code ${code}`);
      return res.status(500).send("Failed to process the file.");
    }

    try {
      const results = fs
        .readFileSync("output/result.txt", "utf8")
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [word, count] = line.split("\t");
          return { word, count: parseInt(count, 10) };
        })
        .sort((a, b) => b.count - a.count);

      fs.unlinkSync("output/result.txt");

      if (results.length > 0) {
        res.json([results[0]]);
      } else {
        res.status(404).send("No results found.");
      }
    } catch (err) {
      console.error(`Error reading the results file: ${err}`);
      res.status(500).send("Could not read the results file.");
    }
  });
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
