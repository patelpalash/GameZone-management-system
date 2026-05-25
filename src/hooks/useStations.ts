import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Station } from "@/types";

export function useStations() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Note: We'll sort on the client side since Firestore orderBy requires an index if combined with complex queries.
    // For stations, it's a small dataset, so client-side sorting is perfectly fine.
    const q = query(collection(db, "stations"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Station[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Station);
      });
      
      data.sort((a, b) => a.name.localeCompare(b.name));
      setStations(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching stations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { stations, loading };
}
