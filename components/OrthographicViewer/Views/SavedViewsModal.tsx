"use client";
import { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { X, Save, Trash } from "lucide-react";
import { ObjectId } from "mongodb";

interface View {
  _id?: string;
  id: string;
  name: string;
  coords: { x: number; y: number; z: number };
  zoom: { XY: number; XZ: number; YZ: number };
  pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  };
  creator: string;
  createdAt: number;
  loadCount: number;
  loadStats: { user: string; count: number; lastLoad: number }[];
}

interface SavedViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  datasetId: string;
  setErrorMessage: (message: string | null) => void;
  setCoords: (coords: { x: number; y: number; z: number }) => void;
  setZoom: (zoom: { XY: number; XZ: number; YZ: number }) => void;
  setPan: (pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  }) => void;
  coords: { x: number; y: number; z: number };
  zoom: { XY: number; XZ: number; YZ: number };
  pan: {
    XY: { x: number; y: number };
    XZ: { x: number; y: number };
    YZ: { x: number; y: number };
  };
  showSaveViewSection: boolean;
  setShowSaveViewSection: (show: boolean) => void;
}

export default function SavedViewsModal({
  isOpen,
  onClose,
  userEmail,
  datasetId,
  setErrorMessage,
  setCoords,
  setZoom,
  setPan,
  coords,
  zoom,
  pan,
  showSaveViewSection,
  setShowSaveViewSection,
}: SavedViewsModalProps) {
  const [savedViews, setSavedViews] = useState<View[]>([]);
  const [selectedView, setSelectedView] = useState<View | null>(null);
  const [selectedViewIds, setSelectedViewIds] = useState<string[]>([]);
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewName, setEditingViewName] = useState("");
  const [viewName, setViewName] = useState("");
  const [listModalPosition, setListModalPosition] = useState({ x: 20, y: 20 });
  const dragRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchViews = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`/api/views?datasetId=${encodeURIComponent(datasetId)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to fetch views");
      const data = await response.json();
      setSavedViews(
        data.views.map((view: { _id: ObjectId; id: string }) => ({ ...view, id: view._id.toString() })) || []
      );
    } catch (error) {
      console.error("Error fetching views:", error);
      setErrorMessage("Failed to fetch saved views");
    }
  };

  const saveView = async () => {
    if (!userEmail) {
      setErrorMessage("Please log in to save views");
      return;
    }
    if (!viewName.trim()) {
      setErrorMessage("View name cannot be empty");
      return;
    }
    try {
      const response = await fetch("/api/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: viewName,
          coords,
          zoom,
          pan,
          creator: userEmail,
          datasetId,
        }),
      });
      if (!response.ok) throw new Error("Failed to save view");
      const data = await response.json();
      console.log("Save view result:", data);
      setSavedViews((prev) => [
        { ...data.view, id: data.view._id.toString() },
        ...prev,
      ]);
      setViewName("");
      setShowSaveViewSection(false);
    } catch (error) {
      console.error("Error saving view:", error);
      setErrorMessage("Failed to save view");
    }
  };

  const updateViewName = async (id: string, newName: string) => {
    if (!userEmail) {
      setErrorMessage("Please log in to update views");
      return;
    }
    if (!newName.trim()) {
      setErrorMessage("View name cannot be empty");
      return;
    }
    try {
      const response = await fetch("/api/views", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName, datasetId }),
      });
      if (!response.ok) throw new Error("Failed to update view name");
      const data = await response.json();
      console.log("Update view name result:", data);
      setSavedViews((prev) =>
        prev.map((view) =>
          view.id === id ? { ...view, name: newName } : view
        )
      );
      setEditingViewId(null);
      setEditingViewName("");
      if (selectedView?.id === id) {
        setSelectedView((prev) => (prev ? { ...prev, name: newName } : null));
      }
    } catch (error) {
      console.error("Error updating view name:", error);
      setErrorMessage("Failed to update view name");
    }
  };

  const deleteSelectedViews = async () => {
    if (!userEmail) {
      setErrorMessage("Please log in to delete views");
      return;
    }
    if (selectedViewIds.length === 0) {
      setErrorMessage("No views selected for deletion");
      return;
    }
    try {
      if (selectedViewIds.length === 1) {
        const id = selectedViewIds[0];
        const response = await fetch(`/api/views?id=${id}&datasetId=${encodeURIComponent(datasetId)}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Failed to delete view");
        const data = await response.json();
        console.log("Delete view result:", data);
      } else {
        const response = await fetch("/api/views/bulk", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedViewIds, datasetId }),
        });
        if (!response.ok) throw new Error("Failed to delete views");
        const data = await response.json();
        console.log("Delete views result:", data);
      }
      setSavedViews((prev) => prev.filter((view) => !selectedViewIds.includes(view.id)));
      setSelectedViewIds([]);
      if (selectedView && selectedViewIds.includes(selectedView.id)) {
        setSelectedView(null);
      }
    } catch (error) {
      console.error("Error deleting views:", error);
      setErrorMessage("Failed to delete views");
    }
  };

  const loadView = async (view: View) => {
    if (!userEmail) {
      setErrorMessage("Please log in to load views");
      return;
    }
    try {
      const response = await fetch(`/api/views/load?id=${view.id}&datasetId=${encodeURIComponent(datasetId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userEmail }),
      });
      if (!response.ok) throw new Error("Failed to load view");
      const data = await response.json();
      console.log("Load view result:", data);
      setCoords(view.coords);
      setZoom(view.zoom);
      setPan(view.pan);
      setSavedViews((prev) =>
        prev.map((v) =>
          v.id === view.id
            ? {
                ...v,
                loadCount: data.view.loadCount,
                loadStats: data.view.loadStats,
              }
            : v
        )
      );
    } catch (error) {
      console.error("Error loading view:", error);
      setErrorMessage("Failed to load view");
    }
  };

  const handleNameClick = (view: View) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setEditingViewId(view.id);
      setEditingViewName(view.name);
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        loadView(view);
        setSelectedView(selectedView?.id === view.id ? null : view);
        clickTimeoutRef.current = null;
      }, 300); // 300ms delay for double-click detection
    }
  };

  const handleSelectView = (id: string) => {
    setSelectedViewIds((prev) =>
      prev.includes(id) ? prev.filter((viewId) => viewId !== id) : [...prev, id]
    );
  };

  const handleDrag = (_e: unknown, data: { x: number; y: number }) => {
    setListModalPosition({ x: data.x, y: data.y });
  };

  useEffect(() => {
    if (isOpen && userEmail && datasetId) fetchViews();
    if (isOpen) {
      setListModalPosition({ x: 20, y: 20 }); // Reset to top-left on open
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userEmail, datasetId]);

  useEffect(() => {
    const handleResize = () => {
      setListModalPosition((prev) => ({
        x: Math.min(prev.x, window.innerWidth - (dragRef.current?.offsetWidth || 400)),
        y: Math.min(prev.y, window.innerHeight - (dragRef.current?.offsetHeight || 400)),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!isOpen) return null;

  return (
    <Draggable
      handle=".handle"
      position={listModalPosition}
      onDrag={handleDrag}
      nodeRef={dragRef}
    >
      <div
        ref={dragRef}
        className="fixed top-0 left-0 z-[3000] bg-white dark:bg-gray-800 p-4 rounded-lg w-full max-w-sm max-h-[80vh] overflow-auto border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-between items-center mb-3 handle" style={{ cursor: "move" }}>
          <h2 className="text-md font-semibold text-gray-900 dark:text-gray-100">
            Saved Views
          </h2>
          <button
            onClick={() => {
              onClose();
              setSelectedView(null);
              setShowSaveViewSection(false);
              setViewName("");
            }}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-600"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-3">
          <button
            onClick={() => setShowSaveViewSection(!showSaveViewSection)}
            className="flex items-center px-2 py-1 text-xs bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            title={showSaveViewSection ? "Hide Save View" : "Add New View"}
          >
            <Save className="w-3 h-3 mr-1" />
            {showSaveViewSection ? "Hide Save View" : "Add New View"}
          </button>
          {showSaveViewSection && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Save New View
              </h3>
              <input
                type="text"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Enter view name"
                className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setViewName("");
                    setShowSaveViewSection(false);
                  }}
                  className="px-2 py-1 text-xs bg-gray-500 text-white rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
                  title="Cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={saveView}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                  title="Save view"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
        {savedViews.length === 0 && !showSaveViewSection ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No saved views
          </p>
        ) : (
          <>
            <table className="w-full text-xs text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                <tr>
                  <th className="w-10 px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedViewIds.length === savedViews.length && savedViews.length > 0}
                      onChange={() =>
                        setSelectedViewIds(
                          selectedViewIds.length === savedViews.length
                            ? []
                            : savedViews.map((view) => view.id)
                        )
                      }
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="w-32 px-2 py-1">Name</th>
                  <th className="w-24 px-2 py-1">Creator</th>
                </tr>
              </thead>
              <tbody>
                {savedViews.map((view) => (
                  <tr key={view.id} className="border-b dark:border-gray-700">
                    <td className="w-10 px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedViewIds.includes(view.id)}
                        onChange={() => handleSelectView(view.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="w-32 px-2 py-1">
                      {editingViewId === view.id ? (
                        <input
                          type="text"
                          value={editingViewName}
                          onChange={(e) => setEditingViewName(e.target.value)}
                          onBlur={() => updateViewName(view.id, editingViewName)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateViewName(view.id, editingViewName);
                            } else if (e.key === "Escape") {
                              setEditingViewId(null);
                              setEditingViewName("");
                            }
                          }}
                          className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 w-full text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => handleNameClick(view)}
                          onDoubleClick={() => {
                            if (clickTimeoutRef.current) {
                              clearTimeout(clickTimeoutRef.current);
                              clickTimeoutRef.current = null;
                            }
                          }}
                          className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 truncate"
                        >
                          {view.name}
                        </span>
                      )}
                    </td>
                    <td className="w-24 px-2 py-1 truncate">{view.creator}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-3">
              <button
                onClick={deleteSelectedViews}
                className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={selectedViewIds.length === 0}
                title="Delete selected views"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
            {selectedView && (
              <div className="mt-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  View Details
                </h3>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                  <p>
                    <strong>Name:</strong>{" "}
                    <span className="truncate">{selectedView.name}</span>
                  </p>
                  <p>
                    <strong>Creator:</strong>{" "}
                    <span className="truncate">{selectedView.creator}</span>
                  </p>
                  <p>
                    <strong>Load Count:</strong> {selectedView.loadCount}
                  </p>
                </div>
                <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 mt-2">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="w-24 px-2 py-1">User</th>
                      <th className="w-12 px-2 py-1">Loads</th>
                      <th className="px-2 py-1">Last Load</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedView.loadStats.map((stat) => (
                      <tr
                        key={stat.user}
                        className="border-b border-gray-200 dark:border-gray-600"
                      >
                        <td className="w-24 px-2 py-1 truncate">{stat.user}</td>
                        <td className="w-12 px-2 py-1">{stat.count}</td>
                        <td className="px-2 py-1">
                          {new Date(stat.lastLoad).toLocaleString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Draggable>
  );
}