import { Routes, Route } from 'react-router-dom';
// import HomeView from './pages/Home';
// import MyProjects from './pages/myProjects';
// import MyTeams from './pages/myTeams';
// import Exchange from './pages/exchanges';
// import Other from './pages/other';
// News
// import News from './pages/news';
import App from './Pages/App'
import Servers from './Pages/Servers'
import Updates from './Pages/Updates'

// function
import CreateServer from './Pages/Function/CreateServer'
import ServerManage from './Pages/ServerManage'
import ServerFiles from './Pages/ServerFiles'
import ServerSettings from './Pages/ServerSettings'

const Router = () => {
  return (
    // <BrowserRouter >
      <Routes>
        <Route path='/' element={<App />} />
        <Route path='/servers' element={<Servers />} />
        <Route path='/updates' element={<Updates />} />

        {/* ———————————功能——————————— */}
        <Route path='/create/server' element={<CreateServer />} />
        <Route path='/server/manage/:serverId' element={<ServerManageWrapper />} />
        <Route path='/server/files/:serverId' element={<ServerFilesWrapper />} />
        <Route path='/server/settings/:serverId' element={<ServerSettingsWrapper />} />

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

// Wrapper for ServerManage to取得serverId
import { useParams } from 'react-router-dom'
function ServerManageWrapper() {
  const { serverId } = useParams()
  return <ServerManage serverId={serverId} />
}

function ServerFilesWrapper() {
  const { serverId } = useParams()
  return <ServerFiles serverId={serverId} />
}

function ServerSettingsWrapper() {
  const { serverId } = useParams()
  return <ServerSettings serverId={serverId} />
}

// 新增 ServerManage 路由
// 請將下列 Route 加入 <Routes> 內：
// <Route path='/server/manage/:serverId' element={<ServerManageWrapper />} />
