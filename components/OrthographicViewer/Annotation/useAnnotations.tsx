import { useCallback, useEffect, useState, useMemo } from "react";
import { ObjectId } from "mongodb";

export type Annotation = {
  _id?: string;
  id: string;
  view: "XY" | "XZ" | "YZ";
  slice: number;
  x: number;
  y: number;
  text: string;
  instance: number;
  datetime: number;
  user: string;
  datasetId: string;
  status: string;
  groupName?: string; // New field for group organization
};

export type Group = {
  _id: string;
  name: string;
  datasetId: string;
  user: string;
  createdAt: Date;
  annotationCount: number;
};

export default function useAnnotations(
  userEmail: string | null,
  setErrorMessage: (message: string | null) => void,
  datasetId: string
) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [viewMode, setViewMode] = useState<"groups" | "annotations">("groups");
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  const fetchAnnotations = useCallback(async () => {
    if (!userEmail) {
      console.log("No authenticated user, skipping fetchAnnotations");
      setAnnotations([]);
      return;
    }
    if (!datasetId) {
      console.error("Dataset ID is required for fetching annotations");
      setErrorMessage("Dataset ID is missing. Please ensure a dataset is selected.");
      return;
    }
    try {
      const response = await fetch(`/api/annotations?datasetId=${encodeURIComponent(datasetId)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch annotations: ${response.statusText}`);
      }

      const data = await response.json();
      const fetchedAnnotations: Annotation[] = data.map((item: {
        _id: ObjectId;
        id: string;
        view: "XY" | "XZ" | "YZ";
        slice: number;
        x: number;
        y: number;
        text: string;
        instance: number;
        datetime: number;
        user: string;
        datasetId: string;
        status: string;
        groupName?: string;
      }) => ({
        _id: item._id?.toString() || "",
        id: item.id,
        view: item.view as "XY" | "XZ" | "YZ",
        slice: item.slice,
        x: item.x,
        y: item.y,
        text: item.text,
        instance: item.instance || 0,
        datetime: item.datetime || Date.now(),
        user: item.user || userEmail,
        datasetId: item.datasetId || datasetId,
        status: item.status || "active",
        groupName: item.groupName || "Default Group",
      }));
      setAnnotations(fetchedAnnotations);
      console.log("Annotations fetched from MongoDB:", fetchedAnnotations.map(a => ({ _id: a._id, id: a.id, user: a.user, datasetId })));
    } catch (error) {
      console.error("Error fetching annotations from MongoDB:", error);
      setErrorMessage("Failed to load annotations. Please try again.");
    }
  }, [userEmail, setErrorMessage, datasetId]);

  const fetchGroups = useCallback(async () => {
    if (!userEmail || !datasetId) return;
    
    try {
      const response = await fetch(`/api/groups?datasetId=${encodeURIComponent(datasetId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.statusText}`);
      }
      
      const groupsData = await response.json();
      
      // Ensure Default Group exists in the fetched groups
      let groupsList = groupsData;
      const hasDefaultGroup = groupsData.some((group: Group) => group.name === "Default Group");
      
      if (!hasDefaultGroup) {
        // Create Default Group if it doesn't exist
        const defaultGroup: Group = {
          _id: `group_Default Group_${datasetId}`,
          name: "Default Group",
          datasetId,
          user: userEmail,
          createdAt: new Date(),
          annotationCount: annotations.filter(a => !a.groupName || a.groupName === "Default Group").length
        };
        groupsList = [defaultGroup, ...groupsData];
      }
      
      setGroups(groupsList);
      console.log("Groups fetched from API with Default Group:", groupsList);
    } catch (error) {
      console.error("Error fetching groups from API:", error);
      // Fallback: create groups from annotations if API fails
      const groupMap = new Map<string, { name: string; count: number; firstAnnotation: Annotation }>();
      
      annotations.forEach(annotation => {
        const groupName = annotation.groupName || "Default Group";
        if (groupMap.has(groupName)) {
          groupMap.get(groupName)!.count++;
        } else {
          groupMap.set(groupName, {
            name: groupName,
            count: 1,
            firstAnnotation: annotation
          });
        }
      });

      // Ensure Default Group exists if there are any annotations
      if (annotations.length > 0 && !groupMap.has("Default Group")) {
        groupMap.set("Default Group", {
          name: "Default Group",
          count: annotations.filter(a => !a.groupName || a.groupName === "Default Group").length,
          firstAnnotation: annotations[0]
        });
      }

      // If no groups exist at all, create a Default Group
      if (groupMap.size === 0) {
        groupMap.set("Default Group", {
          name: "Default Group",
          count: 0,
          firstAnnotation: {
            _id: "",
            id: "",
            view: "XY",
            slice: 0,
            x: 0,
            y: 0,
            text: "",
            instance: 0,
            datetime: Date.now(),
            user: userEmail,
            datasetId,
            status: "active",
            groupName: "Default Group"
          }
        });
      }

      const groupsList: Group[] = Array.from(groupMap.entries()).map(([name, data]) => ({
        _id: `group_${name}_${datasetId}`,
        name: data.name,
        datasetId,
        user: userEmail,
        createdAt: new Date(data.firstAnnotation.datetime),
        annotationCount: data.count
      }));

      setGroups(groupsList);
      console.log("Groups created from fallback:", groupsList);
    }
  }, [userEmail, datasetId, annotations]);

  const createGroup = useCallback(async (groupName: string) => {
    if (!userEmail || !datasetId) return;
    
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: groupName,
          datasetId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create group");
      }

      const newGroup = await response.json();
      console.log("Group created via API:", newGroup);
      
      setGroups(prev => [...prev, newGroup]);
      setSelectedGroup(newGroup);
      setViewMode("annotations");
    } catch (error) {
      console.error("Error creating group via API:", error);
      // Fallback: create group locally if API fails
      const newGroup: Group = {
        _id: `group_${groupName}_${datasetId}`,
        name: groupName,
        datasetId,
        user: userEmail,
        createdAt: new Date(),
        annotationCount: 0
      };
      
      setGroups(prev => [...prev, newGroup]);
      setSelectedGroup(newGroup);
      setViewMode("annotations");
    }
  }, [userEmail, datasetId]);

  const switchToGroup = useCallback((group: Group) => {
    setSelectedGroup(group);
    setViewMode("annotations");
  }, []);

  const switchToGroupsList = useCallback(() => {
    setSelectedGroup(null);
    setViewMode("groups");
  }, []);

  const getAnnotationsForGroup = useCallback((groupName: string) => {
    return annotations.filter(ann => ann.groupName === groupName);
  }, [annotations]);

  // Get current group annotations - this will be used for display
  const currentGroupAnnotations = useMemo(() => {
    if (!selectedGroup) return annotations; // Show all if no group selected
    return annotations.filter(ann => ann.groupName === selectedGroup.name);
  }, [annotations, selectedGroup]);

  const saveAnnotationToMongoDB = useCallback(async (annotation: Annotation, updateOnlyPosition: boolean = false, retryCount: number = 0) => {
    if (!userEmail) {
      console.error("Cannot save annotation: No authenticated user");
      setErrorMessage("Please log in to save annotations.");
      return;
    }

    try {
      const payload = {
        ...annotation,
        user: userEmail,
        datasetId: annotation.datasetId || datasetId,
        groupName: annotation.groupName || "Default Group",
        datetime: Date.now(),
      };

      const method = updateOnlyPosition ? "PUT" : "POST";
      const url = updateOnlyPosition ? "/api/annotations" : "/api/annotations";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to save annotation: ${errorData.error || response.statusText}`);
      }

      if (!updateOnlyPosition) {
        const savedAnnotation = await response.json();
        setAnnotations((prev) => [...prev, savedAnnotation]);
        console.log("Annotation saved to MongoDB:", savedAnnotation);
      } else {
        console.log("Annotation position updated in MongoDB:", payload);
      }

      setErrorMessage(null);
      
      // Refresh groups to update annotation counts
      setTimeout(() => fetchGroups(), 100);
      
    } catch (error) {
      console.error("Error saving annotation to MongoDB:", error);
      if (retryCount < 3) {
        console.log(`Retrying... Attempt ${retryCount + 1}`);
        setTimeout(() => saveAnnotationToMongoDB(annotation, updateOnlyPosition, retryCount + 1), 1000);
      } else {
        setErrorMessage(`Failed to save annotation: ${(error as Error).message}`);
      }
    }
  }, [userEmail, setErrorMessage, datasetId, fetchGroups]);

  const deleteAnnotationFromMongoDB = useCallback(async (annotationId: string) => {
    if (!userEmail) {
      console.error("Cannot delete annotation: No authenticated user");
      setErrorMessage("Please log in to delete annotations.");
      return;
    }

    try {
      const annotation = annotations.find((ann) => ann._id === annotationId || ann.id === annotationId);
      if (!annotation) {
        throw new Error("Annotation not found");
      }

      console.log("Deleting annotation:", { _id: annotation._id, id: annotation.id, user: userEmail, datasetId: annotation.datasetId });

      const response = await fetch("/api/annotations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: annotation._id, datasetId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete annotation: ${errorData.error || response.statusText}`);
      }

      setAnnotations((prev) => prev.filter((ann) => ann._id !== annotationId && ann.id !== annotationId));
      console.log("Annotation deleted from MongoDB:", { _id: annotation._id, id: annotation.id, datasetId });
      setErrorMessage(null);
      
      // Refresh groups to update annotation counts
      setTimeout(() => fetchGroups(), 100);
    } catch (error) {
      console.error("Error deleting annotation from MongoDB:", error);
      setErrorMessage(`Failed to delete annotation: ${(error as Error).message}`);
    }
  }, [userEmail, setErrorMessage, annotations, datasetId, fetchGroups]);

  const handleEditAnnotation = useCallback((id: string, text: string) => {
    setEditingAnnotationId(id);
    setEditingText(text);
  }, []);

  const handleSaveEdit = useCallback((id: string) => {
    const annotation = annotations.find((ann) => ann._id === id || ann.id === id);
    if (annotation) {
      const updatedAnnotation = { ...annotation, text: editingText, datetime: Date.now(), datasetId };
      setAnnotations((prev) =>
        prev.map((ann) => (ann._id === id || ann.id === id ? updatedAnnotation : ann))
      );
      if (editingText && editingText.trim() !== "") {
        saveAnnotationToMongoDB(updatedAnnotation, true);
      } else {
        setAnnotations((prev) => prev.filter((ann) => ann._id !== id && ann.id !== id));
        if (annotation._id) {
          deleteAnnotationFromMongoDB(annotation._id);
        }
      }
      
      // Refresh groups to update annotation counts
      setTimeout(() => fetchGroups(), 100);
    }
    setEditingAnnotationId(null);
    setEditingText("");
  }, [annotations, editingText, saveAnnotationToMongoDB, deleteAnnotationFromMongoDB, datasetId, fetchGroups]);

  // Fetch groups and annotations when component mounts
  useEffect(() => {
    if (userEmail && datasetId) {
      fetchGroups();
      fetchAnnotations();
    }
    // Only run on mount or when user/dataset changes, ignore function recreations
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, datasetId]);

  return {
    annotations,
    setAnnotations,
    isAnnotating,
    setIsAnnotating,
    showAnnotations,
    setShowAnnotations,
    editingAnnotationId,
    setEditingAnnotationId,
    editingText,
    setEditingText,
    fetchAnnotations,
    saveAnnotationToMongoDB,
    deleteAnnotationFromMongoDB,
    handleEditAnnotation,
    handleSaveEdit,
    groups,
    selectedGroup,
    viewMode,
    setViewMode,
    switchToGroup,
    switchToGroupsList,
    getAnnotationsForGroup,
    createGroup,
    currentGroupAnnotations,
    fetchGroups,
  };
}