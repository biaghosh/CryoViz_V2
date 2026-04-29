import { Annotation, Group } from "./useAnnotations";
import React, { useState, useRef } from "react";
import Draggable from "react-draggable";
import { Trash2, Plus, ArrowLeft, FolderOpen, X } from "lucide-react"; // Import icons from lucide-react

interface AnnotationModalProps {
  groups: Group[];
  selectedGroup: Group | null;
  viewMode: "groups" | "annotations";
  editingAnnotationId: string | null;
  editingText: string;
  setEditingAnnotationId: (id: string | null) => void;
  setEditingText: (text: string) => void;
  handleSaveEdit: (id: string) => void;
  deleteAnnotationFromMongoDB: (id: string) => Promise<void>;
  onClose: () => void;
  setCoords: React.Dispatch<React.SetStateAction<{ x: number; y: number; z: number }>>;
  switchToGroup: (group: Group) => void;
  switchToGroupsList: () => void;
  createGroup: (groupName: string) => void;
  currentGroupAnnotations?: Annotation[];
}

export default function AnnotationModal({
  groups,
  selectedGroup,
  viewMode,
  editingAnnotationId,
  editingText,
  setEditingAnnotationId,
  setEditingText,
  handleSaveEdit,
  deleteAnnotationFromMongoDB,
  onClose,
  setCoords,
  switchToGroup,
  switchToGroupsList,
  createGroup,
  currentGroupAnnotations = [],
}: AnnotationModalProps) {
  const [selectedAnnotationIds, setSelectedAnnotationIds] = useState<string[]>([]);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Top-left position
  const [newGroupName, setNewGroupName] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDrag = (_e: unknown, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y });
  };

  const handleLabelDoubleClick = (id: string, currentText: string) => {
    setEditingAnnotationId(id);
    setEditingText(currentText || "");
  };

  const handleLabelClick = (view: "XY" | "XZ" | "YZ", slice: number) => {
    const axisMap: { [key in "XY" | "XZ" | "YZ"]: keyof { x: number; y: number; z: number } } = {
      XY: "z",
      XZ: "y",
      YZ: "x",
    };
    const axis = axisMap[view];
    setCoords((prev: { x: number; y: number; z: number } ) => ({ ...prev, [axis]: slice }));
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedAnnotationIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedAnnotationIds.length > 0) {
      await Promise.all(selectedAnnotationIds.map(id => deleteAnnotationFromMongoDB(id)));
      setSelectedAnnotationIds([]);
    }
  };

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      createGroup(newGroupName.trim());
      setNewGroupName("");
      setShowCreateGroup(false);
    }
  };

  // Use filtered annotations for the current group
  const displayAnnotations = viewMode === "annotations" && selectedGroup ? currentGroupAnnotations : [];

  return (
    <Draggable handle=".handle" position={position} onDrag={handleDrag} nodeRef={dragRef}>
      <div ref={dragRef} className="fixed z-[3000]">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header with helpful message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3 handle cursor-move">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {viewMode === "groups" ? "Groups List" : "Annotations List"}
                </h2>
                {viewMode === "annotations" && selectedGroup && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    {currentGroupAnnotations.length} annotation{(currentGroupAnnotations.length !== 1 ? 's' : '')} visible
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-auto relative handle border border-gray-200 dark:border-gray-700">
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {viewMode === "annotations" && selectedGroup && (
                  <button
                    onClick={switchToGroupsList}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    title="Back to groups"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {viewMode === "groups" ? "Groups" : `Group: ${selectedGroup?.name}`}
                </h2>
              </div>
              {viewMode === "groups" && (
                <button
                  onClick={() => setShowCreateGroup(!showCreateGroup)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  title="Create new group"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Create Group Form */}
            {showCreateGroup && (
              <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="flex-1 px-2 py-1 border rounded text-sm dark:bg-gray-600 dark:text-gray-100"
                    onKeyPress={(e) => e.key === "Enter" && handleCreateGroup()}
                  />
                  <button
                    onClick={handleCreateGroup}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateGroup(false)}
                    className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Groups List View */}
            {viewMode === "groups" && (
              <div className="space-y-2">
                {groups.length === 0 ? (
                  <div className="text-center text-gray-400 py-4">
                    No groups found. Create a new group to get started.
                  </div>
                ) : (
                  groups.map((group) => (
                    <div
                      key={group._id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => switchToGroup(group)}
                    >
                      <div className="flex items-center gap-3">
                        <FolderOpen size={20} className="text-blue-500" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {group.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {group.annotationCount} annotation{group.annotationCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Annotations List View */}
            {viewMode === "annotations" && selectedGroup && (
              <>
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-2 py-1">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAnnotationIds(currentGroupAnnotations.map(ann => ann._id || ann.id));
                            } else {
                              setSelectedAnnotationIds([]);
                            }
                          }}
                          checked={selectedAnnotationIds.length === currentGroupAnnotations.length}
                        />
                      </th>
                      <th className="px-2 py-1">Label</th>
                      <th className="px-2 py-1">Plane</th>
                      <th className="px-2 py-1">Slice</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayAnnotations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-2 py-1 text-center text-gray-400">
                          No annotations in this group
                        </td>
                      </tr>
                    ) : (
                      displayAnnotations.map((ann) => (
                        <tr
                          key={ann._id || ann.id}
                          className={`border-b border-gray-200 dark:border-gray-700 ${selectedAnnotationIds.includes(ann._id || ann.id) ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                          onClick={() => handleLabelClick(ann.view, ann.slice)}
                        >
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedAnnotationIds.includes(ann._id || ann.id)}
                              onChange={() => handleCheckboxChange(ann._id || ann.id)}
                            />
                          </td>
                          <td
                            className="px-2 py-1 cursor-pointer"
                            onDoubleClick={() => handleLabelDoubleClick(ann._id || ann.id, ann.text || "")}
                          >
                            {editingAnnotationId === (ann._id || ann.id) ? (
                              <input
                                type="text"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onBlur={() => handleSaveEdit(ann._id || ann.id)}
                                onKeyPress={(e) => e.key === "Enter" && handleSaveEdit(ann._id || ann.id)}
                                autoFocus
                                className="border rounded px-1 py-0.5 w-full dark:bg-gray-700 dark:text-gray-100 text-sm"
                              />
                            ) : (
                              ann.text || "N/A"
                            )}
                          </td>
                          <td className="px-2 py-1 text-gray-400">{ann.view}</td>
                          <td className="px-2 py-1 text-gray-400">{ann.slice}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="flex justify-end mt-1">
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 disabled:opacity-50"
                    disabled={selectedAnnotationIds.length === 0}
                    aria-label="Delete selected annotations"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Close Button */}
            <div className="flex justify-end mt-3">
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}