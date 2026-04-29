"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Folder, X, Download, List } from "lucide-react";
import Draggable from "react-draggable";
import Image from "next/image";

interface MediaFile {
  id: string;
  name: string;
  tag: string;
  url: string;
}

interface MediaControlPanelProps {
  datasetId: string;
  setErrorMessage: (message: string | null) => void;
}

export default function MediaControlPanel({ datasetId, setErrorMessage }: MediaControlPanelProps) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email ?? undefined;
  const userId: string | undefined = session?.user?.name ?? userEmail; // no nulls  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [previewModalPosition, setPreviewModalPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<HTMLDivElement>(null);
  const previewDragRef = useRef<HTMLDivElement>(null);

  const fetchFiles = async () => {
    if (!userEmail) {
      setErrorMessage("User not authenticated");
      return;
    }
    try {
      const response = await fetch(`/api/media?dataset=${datasetId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "X-User-Id": userId } : {}),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      console.log("API Response:", data); // Debug: Log the full response
      setMediaFiles(data.files || []);
      setSelectedFileIds([]); // Reset selection on fetch
    } catch (error) {
      console.error("Error fetching files:", error instanceof Error ? error.message : "Unknown error");
      setErrorMessage("Failed to fetch media files");
    }
  };

  const downloadFile = async (file: MediaFile) => {
    try {
      const response = await fetch(file.url, {
        method: "GET",
        headers: {
          ...(userId ? { "X-User-Id": userId } : {}),
        },
      });
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading file:", error instanceof Error ? error.message : "Unknown error", "URL:", file.url);
      setErrorMessage(`Failed to download file: ${file.name}`);
    }
  };

  const downloadSelectedFiles = async () => {
    if (selectedFileIds.length === 0) {
      setErrorMessage("No files selected for download");
      return;
    }
    try {
      for (const filename of selectedFileIds) {
        const file = mediaFiles.find((f) => f.name === filename);
        if (file) await downloadFile(file);
      }
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage("Failed to download some files: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  const getFileExtension = (filename: string): string => {
    return filename.split(".").pop()?.toLowerCase() || "";
  };

  const renderPreview = (file: MediaFile) => {
    const ext = getFileExtension(file.name); // Use file name extension if tag is unreliable
    if (ext === "txt") {
      return <iframe src={file.url} className="w-full h-64 border-0" />;
    } else if (ext === "mp4") {
      return (
        <video controls className="w-full h-auto max-h-64">
          <source src={file.url} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      );
    } else if (["jpeg", "jpg", "png"].includes(ext)) {
      return <Image src={file.url} alt={file.name} width={400} height={256} className="w-full h-auto max-h-64" style={{ objectFit: 'contain' }} />;
    } else if (ext === "pdf") {
      return (
        <iframe
          src={`${file.url}#toolbar=0&navpanes=0`} // Hide toolbar and navigation panes
          className="w-full h-64 border-0"
          title={`Preview of ${file.name}`}
          onError={() => console.log(`Failed to load preview for ${file.name}, URL: ${file.url}`)} // Debug error
        />
      );
    } else if (ext === "docx") {
      return <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available for .docx files. Please download to view.</p>;
    }
    return <p className="text-sm text-gray-500 dark:text-gray-400">Preview not available</p>;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFileIds(mediaFiles.map((file) => file.name));
    } else {
      setSelectedFileIds([]);
    }
  };

  const handleSelectFile = (filename: string, checked: boolean) => {
    if (checked) {
      setSelectedFileIds((prev) => [...prev, filename]);
    } else {
      setSelectedFileIds((prev) => prev.filter((id) => id !== filename));
    }
  };

  useEffect(() => {
    if (userEmail) fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    if (isListModalOpen) {
      const modalWidth = 384; // Approximate max-w-md
      const modalHeight = 400; // Approximate height
      const x = (window.innerWidth - modalWidth) / 2;
      const y = (window.innerHeight - modalHeight) / 2;
      setModalPosition({ x, y });
    }
  }, [isListModalOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (isListModalOpen) {
        setModalPosition((prev) => ({
          x: Math.min(prev.x, window.innerWidth - (dragRef.current?.offsetWidth || 384)),
          y: Math.min(prev.y, window.innerHeight - (dragRef.current?.offsetHeight || 400)),
        }));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isListModalOpen]);

  useEffect(() => {
    if (previewFile) {
      const modalWidth = 384; // Approximate max-w-md
      const modalHeight = 400; // Approximate height
      const x = (window.innerWidth - modalWidth) / 2;
      const y = (window.innerHeight - modalHeight) / 2;
      setPreviewModalPosition({ x, y });
    }
  }, [previewFile]);

  useEffect(() => {
    const handleResize = () => {
      if (previewFile) {
        setPreviewModalPosition((prev) => ({
          x: Math.min(prev.x, window.innerWidth - (previewDragRef.current?.offsetWidth || 384)),
          y: Math.min(prev.y, window.innerHeight - (previewDragRef.current?.offsetHeight || 400)),
        }));
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [previewFile]);

  return (
    <>
      <div style={{ position: "absolute", bottom: 210, left: 10, zIndex: 10 }}>
        <button
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-blue-600 dark:hover:bg-red-400 dark:hover:text-white hover:text-white transition-colors group"
          title="Media and Files"
        >
          <div className="relative">
            <Folder className="w-5 h-5 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
          </div>
        </button>
        {isDropdownOpen && (
          <div
            className="bg-white dark:bg-gray-800 shadow-lg rounded-md py-2 w-48 z-[1000]"
            style={{ position: "absolute", bottom: 40, left: 40, fontSize: "0.85rem" }}
          >
            <ul className="text-sm text-gray-700 dark:text-gray-200">
              <li>
                <button
                  onClick={() => {
                    setIsListModalOpen(true);
                    setIsDropdownOpen(false);
                  }}
                  className="flex items-center w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 group"
                  title="List uploaded files"
                >
                  <div className="relative mr-2">
                    <List className="w-4 h-4 transition-transform duration-200 transform group-hover:scale-110 group-hover:-rotate-x-10 group-hover:-rotate-y-10" />
                  </div>
                  List Files
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
      {isListModalOpen && (
        <Draggable
          handle=".handle"
          position={modalPosition}
          onDrag={(e, data) => setModalPosition({ x: data.x, y: data.y })}
          nodeRef={dragRef}
        >
          <div
            ref={dragRef}
            className="fixed top-0 left-0 z-[1000] bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-md"
          >
            <div className="flex justify-between items-center mb-4 handle" style={{ cursor: "move" }}>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Media Files</h2>
              <button
                onClick={() => {
                  setIsListModalOpen(false);
                  setSelectedFileIds([]);
                }}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-600"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {mediaFiles.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No uploaded files</p>
            ) : (
              <>
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-2 py-1 w-12">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.length === mediaFiles.length && mediaFiles.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4"
                          title="Select all files"
                        />
                      </th>
                      <th className="px-2 py-1">File Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaFiles.map((file) => (
                      <tr key={file.id} className="border-b dark:border-gray-700">
                        <td className="px-2 py-1 w-12">
                          <input
                            type="checkbox"
                            checked={selectedFileIds.includes(file.name)}
                            onChange={(e) => handleSelectFile(file.name, e.target.checked)}
                            className="w-4 h-4"
                            title={`Select ${file.name}`}
                          />
                        </td>
                        <td
                          className="px-2 py-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 truncate"
                          onClick={() => {
                            console.log("Previewing file:", file); // Debug: Log file object
                            setPreviewFile(file);
                            setIsListModalOpen(false);
                          }}
                          title={`View ${file.name}`}
                        >
                          {file.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={downloadSelectedFiles}
                    className="p-1 text-xs rounded-md bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                    title="Download selected files"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </Draggable>
      )}
      {previewFile && (
        <Draggable
          handle=".preview-handle"
          position={previewModalPosition}
          onDrag={(e, data) => setPreviewModalPosition({ x: data.x, y: data.y })}
          nodeRef={previewDragRef}
        >
          <div
            ref={previewDragRef}
            className="fixed top-0 left-0 z-[2000] bg-white dark:bg-gray-900 p-4 rounded-lg w-full max-w-md shadow-md transition-all duration-200"
          >
            <div className="flex justify-between items-center mb-3 preview-handle" style={{ cursor: "move" }}>
              <h2 className="text-md font-medium text-gray-900 dark:text-gray-100 truncate">{previewFile.name}</h2>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {renderPreview(previewFile)}
            <button
              onClick={() => setPreviewFile(null)}
              className="mt-3 px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 transition-colors"
              title="Close preview"
            >
              Close
            </button>
          </div>
        </Draggable>
      )}
    </>
  );
}