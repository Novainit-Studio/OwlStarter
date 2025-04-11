import { Routes, Route } from 'react-router-dom';
// import HomeView from './pages/Home';
// import MyProjects from './pages/myProjects';
// import MyTeams from './pages/myTeams';
// import Exchange from './pages/exchanges';
// import Other from './pages/other';
// News
// import News from './pages/news';
import App from './Pages/App'

const Router = () => {
  return (
    // <BrowserRouter >
      <Routes>
        <Route path='/' element={<App />} />
        {/* <Route path='/projects' element={<MyProjects />} />
        <Route path='/teams' element={<MyTeams />} />
        <Route path='/exchange' element={<Exchange />} />
        <Route path='/other' element={<Other />} /> */}

        {/* News */}
        {/* <Route path='/news/:date' element={<News />} /> */}

      </Routes>
    // </BrowserRouter>
  );
};

export default Router;
