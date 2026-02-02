import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import InterviewPage from "./pages/InterviewPage";
import Result from "./pages/Result";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/interview" element={<InterviewPage />} />
        <Route path="/result" element={<Result />} />

      </Routes>
    </BrowserRouter>
  );
}
