import { useMemo, useState } from "react";
import API from "../lib/api";
import ShareModal from "./ShareModal";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MediaCard({
  item,
  onClick,
  onDelete,
  onEdit,
  currentUserId,
}) {
  const src = useMemo(() => `${API_BASE}${item.file_path}`, [item]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("Title cannot be empty");
      return;
    }
    setEditLoading(true);
    setEditError("");
    try {
      await API.patch(`/media/${item.id}`, { title: editTitle.trim() });
      setEditOpen(false);
      setEditLoading(false);
      setMenuOpen(false);
      if (onEdit) onEdit(item.id, editTitle.trim());
    } catch (err) {
      console.error("Full edit error:", err);
      console.error("Error response:", err.response);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to update title";
      setEditError(errorMessage);
      setEditLoading(false);
    }
  };

  return (
    <div className="group cursor-pointer relative" onClick={onClick}>
      {/* Card layout & preview */}
      <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-blue-200/30 via-blue-100/20 to-transparent hover:from-blue-300/40 hover:via-blue-200/30 transition-all duration-700 hover:scale-[1.01] shadow-2xl hover:shadow-3xl">
        <div className="relative bg-white rounded-2xl overflow-hidden backdrop-blur-xl border border-blue-200/50">
          <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-t-2xl">
            {item.type === "image" ? (
              <img
                src={src}
                alt={item.title}
                className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-110 group-hover:contrast-125"
              />
            ) : (
              <video
                src={src}
                className="w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-110"
                muted
                preload="metadata"
                style={{ background: "#E5EDF1" }}
              />
            )}
            {/* No quick actions on preview */}
          </div>
          {/* Card info */}
          <div className="p-6 bg-white backdrop-blur-md border-t border-blue-200/50">
            <h3 className="text-gray-800 font-semibold text-lg mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition duration-300">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span className="font-bold">
                {item.uploaded_by_username || "Unknown"}
              </span>
              <span>· {formatTimeAgo(item.created_at)} ago</span>
            </div>
            {/* Action row */}
            <div className="pt-3 mt-3 border-t border-blue-200/50 flex items-center justify-center gap-8">
              <button
                type="button"
                aria-label="Edit title"
                className="text-gray-600 hover:text-blue-600 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditTitle(item.title);
                  setEditError("");
                  setEditOpen(true);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Delete file"
                className="text-gray-600 hover:text-red-600 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmOpen(true);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Share media"
                className="text-gray-600 hover:text-purple-600 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  setShareModalOpen(true);
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 10-2.83-4H12a3 3 0 100 6 3 3 0 003-2z" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 14a3 3 0 10-2.83 4H4a3 3 0 100-6 3 3 0 003 2z" strokeWidth={2} />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l8-4M8 16l8 4" strokeWidth={2} />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal Popup (fullscreen, centered) */}
      {editOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          tabIndex={-1}
          onClick={() => setEditOpen(false)}
        >
          <div
            className="max-w-xl w-full bg-white/40 border border-blue-200/20 rounded-3xl shadow-2xl p-10 mx-auto flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center border border-blue-200/50">
                <svg
                  className="w-7 h-7 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold tracking-wide mb-2 text-gray-800">
                  Edit Description
                </h3>
                <p className="text-gray-600">
                  Update the title of your media file
                </p>
              </div>
            </div>
            <form onSubmit={handleEditSubmit} className="w-full">
              <label
                className="block text-gray-700 text-sm font-bold mb-3 tracking-wider"
                htmlFor="media-title"
              >
                Title
              </label>
              <input
                id="media-title"
                type="text"
                className="w-full px-4 py-4 bg-white/10 border border-blue-200/50 rounded-xl text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-lg mb-4"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Enter new title..."
                autoFocus
              />
              {editError && (
                <div className="mb-4 text-red-400 font-semibold bg-red-500/20 border border-red-500/30 rounded px-4 py-2">
                  {editError}
                </div>
              )}
              <div className="flex gap-4 pt-2 justify-end">
                <button
                  type="button"
                  className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-gray-800 font-bold border border-blue-200/50 hover:border-blue-300 transition tracking-wider"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    editLoading ||
                    !editTitle.trim() ||
                    editTitle.trim() === item.title
                  }
                  className="px-8 py-3 bg-blue-700 hover:bg-blue-800 rounded-xl text-white font-bold transition shadow-xl disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block"></span>
                      Saving...
                    </>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="max-w-md w-full bg-white/40 border border-blue-200/20 rounded-3xl shadow-2xl p-8 mx-auto flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold tracking-wide mb-2 text-gray-800">
              Edit Description
            </h3>
            <div className="text-sm text-gray-600 mb-6 text-center leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-bold text-gray-800">"{item.title}"</span>?
              <br />
              This action cannot be undone.
            </div>
            <div className="flex gap-4 w-full pt-2 justify-end">
              <button
                className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-gray-800 font-bold border border-blue-200/50 hover:border-blue-300 transition tracking-wider"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold transition shadow-xl tracking-wider"
                onClick={() => {
                  setConfirmOpen(false);
                  setMenuOpen(false);
                  if (onDelete) onDelete(item.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {shareModalOpen && (
        <ShareModal
          mediaId={item.id} // <- pass media info
          currentUserId={currentUserId} // <- pass current user id (make sure the prop is available!)
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
