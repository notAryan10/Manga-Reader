import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MangaList from './components/MangaList';
import MangaReader from './components/MangaReader';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MangaList />} />
        <Route path="/manga/:mangaId" element={<MangaReader />} />
      </Routes>
    </Router>
  );
};

export default App;
