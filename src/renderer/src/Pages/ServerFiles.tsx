import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, FileText, ArrowLeft, FolderOpen, Save, Trash2 } from 'lucide-react'

type Entry = { name: string; type: 'file' | 'dir'; path: string }

function ServerFiles({ serverId }: { serverId?: string }) {
  const navigate = useNavigate()
  const [currentDir, setCurrentDir] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedFile, setSelectedFile] = useState<Entry | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const crumbs = useMemo(() => {
    const parts = currentDir ? currentDir.split('/') : []
    const list = [{ label: '根目錄', path: '' }]
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      list.push({ label: part, path: acc })
    }
    return list
  }, [currentDir])

  const loadEntries = async (dir = currentDir) => {
    if (!serverId) return
    setLoading(true)
    try {
      const data = await window.api.listServerFiles(Number(serverId), dir)
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [currentDir, serverId])

  useEffect(() => {
    return () => {
      localStorage.removeItem('activeServerId')
    }
  }, [])

  const openEntry = async (entry: Entry) => {
    setErrorMessage('')
    if (entry.type === 'dir') {
      setCurrentDir(entry.path)
      setSelectedFile(null)
      setFileContent('')
      return
    }
    if (!serverId) return
    try {
      const res = await window.api.readServerFile(Number(serverId), entry.path)
      setSelectedFile(entry)
      setFileContent(res.content ?? '')
    } catch (error) {
      setSelectedFile(null)
      setFileContent('')
      setErrorMessage(error instanceof Error ? error.message : '無法讀取檔案')
    }
  }

  const saveFile = async () => {
    if (!serverId || !selectedFile) return
    await window.api.writeServerFile(Number(serverId), selectedFile.path, fileContent)
  }

  const deleteEntry = async (entry: Entry) => {
    if (!serverId) return
    const ok = confirm(`確定要刪除 ${entry.name} 嗎？`)
    if (!ok) return
    await window.api.deleteServerFile(Number(serverId), entry.path)
    if (selectedFile?.path === entry.path) {
      setSelectedFile(null)
      setFileContent('')
    }
    loadEntries()
  }

  return (
    <div className="page-shell px-6 py-8">
      <div className="panel panel-glow p-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-sky-200" />
          <div>
            <h1 className="title-display text-2xl">伺服器檔案管理</h1>
            <p className="text-sm text-slate-400">快速檢視與編輯伺服器檔案</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-sm inline-flex items-center gap-2" onClick={() => navigate(`/server/manage/${serverId}`)}>
            <ArrowLeft size={16} />
            返回管理
          </button>
          <button className="btn-ghost text-sm" onClick={() => window.api.openServerFolder(Number(serverId), currentDir)}>
            在檔案總管開啟
          </button>
        </div>
      </div>

      <div className="panel p-4 mb-4 flex items-center gap-2 text-sm text-slate-400">
        {crumbs.map((crumb, index) => (
          <button
            key={crumb.path}
            className="hover:text-slate-100"
            onClick={() => setCurrentDir(crumb.path)}
          >
            {index === 0 ? '根目錄' : `/${crumb.label}`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="panel p-4 xl:col-span-1">
          <div className="mb-3 text-sm text-slate-400">檔案列表</div>
          {loading && <div className="text-sm text-slate-400">載入中...</div>}
          {!loading && entries.length === 0 && <div className="text-sm text-slate-400">此資料夾沒有檔案</div>}
          <ul className="space-y-2 text-sm">
            {entries.map((entry) => (
              <li key={entry.path} className="panel-soft px-3 py-2 flex items-center justify-between">
                <button className="flex items-center gap-2 text-slate-200" onClick={() => openEntry(entry)}>
                  {entry.type === 'dir' ? <Folder size={16} /> : <FileText size={16} />}
                  <span>{entry.name}</span>
                </button>
                <button className="text-rose-300 hover:text-rose-200" onClick={() => deleteEntry(entry)}>
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-slate-400">
              {selectedFile ? selectedFile.path : '選擇檔案以編輯'}
            </div>
            <button className="btn-primary text-sm inline-flex items-center gap-2" onClick={saveFile} disabled={!selectedFile}>
              <Save size={16} />
              儲存
            </button>
          </div>
          {errorMessage && (
            <div className="mb-3 panel-soft text-rose-300 text-sm px-3 py-2">
              {errorMessage}
            </div>
          )}
          <textarea
            className="w-full h-[420px] bg-[#05070d] text-emerald-200 font-mono text-sm p-3 rounded-lg border border-[#1a2740]"
            value={fileContent}
            onChange={(event) => setFileContent(event.target.value)}
            placeholder="選擇檔案以開始編輯"
            disabled={!selectedFile}
          />
        </div>
      </div>
    </div>
  )
}

export default ServerFiles
