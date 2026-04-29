import { useEffect, useRef, useState } from "react";
import { Edit, Eye, List, Pen, FolderOpen } from "lucide-react";
import { Group } from "./useAnnotations";

interface AnnotationPanelProps {
  isAnnotating: boolean;
  showAnnotations: boolean;
  onToggleAnnotating: () => void;
  onToggleVisibility: () => void;
  onOpenModal: () => void;
  onCloseModal: () => void; // Add close modal function
  showModal: boolean; // Add this to sync button state
  groups?: Group[];
  selectedGroup?: Group | null;
  viewMode?: "groups" | "annotations";
  onSwitchToGroup?: (group: Group) => void;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  isAnnotating,
  showAnnotations,
  onToggleAnnotating,
  onToggleVisibility,
  onOpenModal,
  onCloseModal,
  showModal,
  groups = [],
  selectedGroup = null,
  viewMode = "groups",
  onSwitchToGroup,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync modal state with parent
  useEffect(() => {
    // This will be updated when the parent modal state changes
    // For now, we'll keep it simple and let the button handle the toggle
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure groups is always an array
  const safeGroups = Array.isArray(groups) ? groups : [];

  // Safe callback functions
  const safeSwitchToGroup = onSwitchToGroup || (() => {});

  return (
    <div style={{ position: "absolute", bottom: 110, left: 10, zIndex: 10 }} ref={menuRef}>
      <button
        onClick={() => setShowMenu((prev) => !prev)}
        className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-red-400 dark:hover:text-white hover:text-white transition-colors group"
        title="Annotation options"
      >
        <Pen className="w-4 h-4" />
      </button>

      {/* Current Group Indicator - Moved below the button */}
      {showMenu && (
        <div
          className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-[1000]"
          style={{
            position: "absolute",
            bottom: 40,
            left: 40,
            fontSize: "0.85rem",
          }}
        >
          {/* Current Group Display */}
          {selectedGroup && viewMode === "annotations" && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">Current Group:</div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {selectedGroup.name}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              onToggleAnnotating();
              setShowMenu(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white transition-colors ${
              isAnnotating ? "bg-blue-100 dark:bg-blue-900" : ""
            } group`}
            title={isAnnotating ? "Disable annotating" : "Enable annotating"}
          >
            <div className="relative mr-2">
              <Edit size={16} className="transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
            </div>
            {isAnnotating ? "Disable Annotating" : "Enable Annotating"}
          </button>
          <button
            onClick={() => {
              onToggleVisibility();
              setShowMenu(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white transition-colors ${
              showAnnotations ? "bg-blue-100 dark:bg-blue-900" : ""
            } group`}
            title={showAnnotations ? "Hide annotations" : "Show annotations"}
          >
            <div className="relative mr-2">
              <Eye size={16} className="transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
            </div>
            {showAnnotations ? "Hide Annotations" : "Show Annotations"}
          </button>
          <button
            onClick={() => {
              // Toggle modal state
              if (showModal) {
                onCloseModal();
              } else {
                onOpenModal();
              }
              setShowMenu(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm transition-colors group ${
              showModal 
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" 
                : "text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white"
            }`}
            title={showModal ? "Close annotations modal" : "View all annotations"}
          >
            <div className="relative mr-2">
              <List size={16} className="transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
            </div>
            {showModal ? "Close Annotations" : "View All Annotations"}
          </button>

          {/* Quick Group Switcher */}
          {safeGroups.length > 0 && (
            <>
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Group Switch:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {safeGroups.map((group) => (
                    <button
                      key={group._id}
                      onClick={() => {
                        safeSwitchToGroup(group);
                        setShowMenu(false);
                      }}
                      className={`flex items-center w-full px-2 py-1 text-xs rounded hover:bg-blue-500 hover:text-white transition-colors ${
                        selectedGroup?._id === group._id ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      <FolderOpen size={12} className="mr-1" />
                      <span className="truncate">{group.name}</span>
                      <span className="ml-auto text-xs opacity-70">({group.annotationCount})</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotationPanel;