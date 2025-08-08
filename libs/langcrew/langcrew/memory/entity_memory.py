"""Entity memory implementation for storing information about entities"""

from datetime import datetime
from typing import Any

from langgraph.store.base import BaseStore
from langgraph.store.memory import InMemoryStore

from .base import MemoryConfig


class EntityMemory:
    """Entity memory for storing information about people, organizations, concepts, etc."""
    
    def __init__(self, store: BaseStore | None = None, config: MemoryConfig | None = None):
        self.store = store or InMemoryStore()
        self.config = config or MemoryConfig()
        self._namespace_prefix = ("entities",)
    
    def save(self, value: Any, metadata: dict[str, Any] | None = None, agent: str | None = None) -> None:
        """Save entity information"""
        metadata = metadata or {}
        
        # Extract entity information
        entity_name = metadata.get("entity_name", "unknown")
        entity_type = metadata.get("entity_type", "general")
        
        # Build entity record
        entity_record = {
            "name": entity_name,
            "type": entity_type,
            "description": value,
            "attributes": metadata.get("attributes", {}),
            "relationships": metadata.get("relationships", []),
            "mentions": metadata.get("mentions", 1),
            "last_updated": datetime.now().isoformat(),
            "created_by": agent,
            "metadata": metadata
        }
        
        # Build namespace by entity type
        namespace = self._namespace_prefix + (entity_type,)
        
        # Use entity name as key for easy updates
        key = entity_name.lower().replace(" ", "_")
        
        # Check if entity already exists
        existing = self._get_entity(namespace, key)
        if existing:
            # Update existing entity
            entity_record["mentions"] = existing.get("mentions", 0) + 1
            entity_record["created_at"] = existing.get("created_at", entity_record["last_updated"])
            
            # Merge attributes
            existing_attrs = existing.get("attributes", {})
            existing_attrs.update(entity_record["attributes"])
            entity_record["attributes"] = existing_attrs
            
            # Merge relationships
            existing_rels = set(existing.get("relationships", []))
            new_rels = set(entity_record["relationships"])
            entity_record["relationships"] = list(existing_rels.union(new_rels))
        else:
            entity_record["created_at"] = entity_record["last_updated"]
        
        # Save to store
        self.store.put(
            namespace=namespace,
            key=key,
            value=entity_record
        )
    
    def get_entities(self, entity_type: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
        """Get all entities of a specific type"""
        if entity_type:
            namespace = self._namespace_prefix + (entity_type,)
            items = self.store.list(namespace=namespace)
        else:
            # Get all entities across all types
            items = []
            for ns in self.store.list_namespaces(prefix=self._namespace_prefix):
                ns_items = self.store.list(namespace=ns)
                items.extend(ns_items)
        
        # Extract values and sort by mentions
        entities = [item[1] for item in items]
        entities.sort(key=lambda x: x.get("mentions", 0), reverse=True)
        
        return entities[:limit]
    
    def search(self, query: str, entity_type: str | None = None, limit: int = 5) -> list[dict[str, Any]]:
        """Search for entities by name or description"""
        # Get candidates
        candidates = self.get_entities(entity_type, limit=100)
        
        # Simple keyword matching
        results = []
        query_lower = query.lower()
        
        for entity in candidates:
            # Check name, description, and attributes
            searchable_text = " ".join([
                entity.get("name", ""),
                entity.get("description", ""),
                str(entity.get("attributes", {}))
            ]).lower()
            
            if query_lower in searchable_text:
                results.append(entity)
                if len(results) >= limit:
                    break
        
        return results
    
    def get_entity(self, entity_name: str, entity_type: str | None = None) -> dict[str, Any] | None:
        """Get a specific entity by name"""
        key = entity_name.lower().replace(" ", "_")
        
        if entity_type:
            # Look in specific type namespace
            namespace = self._namespace_prefix + (entity_type,)
            return self._get_entity(namespace, key)
        else:
            # Search across all types
            for ns in self.store.list_namespaces(prefix=self._namespace_prefix):
                entity = self._get_entity(ns, key)
                if entity:
                    return entity
        
        return None
    
    def get_relationships(self, entity_name: str) -> list[dict[str, Any]]:
        """Get all entities related to a given entity"""
        entity = self.get_entity(entity_name)
        if not entity:
            return []
        
        related_entities = []
        relationships = entity.get("relationships", [])
        
        for rel in relationships:
            related = self.get_entity(rel)
            if related:
                related_entities.append(related)
        
        return related_entities
    
    def update_entity(self, entity_name: str, updates: dict[str, Any], 
                     entity_type: str | None = None) -> bool:
        """Update an existing entity"""
        entity = self.get_entity(entity_name, entity_type)
        if not entity:
            return False
        
        # Update fields
        for key, value in updates.items():
            if key == "attributes":
                # Merge attributes
                entity["attributes"].update(value)
            elif key == "relationships":
                # Merge relationships
                existing = set(entity.get("relationships", []))
                new = set(value)
                entity["relationships"] = list(existing.union(new))
            else:
                entity[key] = value
        
        entity["last_updated"] = datetime.now().isoformat()
        
        # Save back
        namespace = self._namespace_prefix + (entity.get("type", "general"),)
        key = entity_name.lower().replace(" ", "_")
        
        self.store.put(
            namespace=namespace,
            key=key,
            value=entity
        )
        
        return True
    
    def clear(self, entity_type: str | None = None) -> None:
        """Clear entity memories"""
        if entity_type:
            namespace = self._namespace_prefix + (entity_type,)
            items = self.store.list(namespace=namespace)
            for key, _ in items:
                self.store.delete(namespace=namespace, key=key)
        else:
            # Clear all entities
            for ns in self.store.list_namespaces(prefix=self._namespace_prefix):
                items = self.store.list(namespace=ns)
                for key, _ in items:
                    self.store.delete(namespace=ns, key=key)
    
    def _get_entity(self, namespace: tuple, key: str) -> dict[str, Any] | None:
        """Get entity from store"""
        try:
            items = self.store.list(namespace=namespace)
            for item_key, item_value in items:
                if item_key == key:
                    return item_value
        except:
            pass
        return None
    
    def format_as_context(self, entities: list[dict[str, Any]]) -> str:
        """Format entities as context string for prompt injection"""
        if not entities:
            return ""
        
        context_parts = ["Known entities:"]
        
        # Group by type
        by_type = {}
        for entity in entities:
            entity_type = entity.get("type", "general")
            if entity_type not in by_type:
                by_type[entity_type] = []
            by_type[entity_type].append(entity)
        
        # Format each type
        for entity_type, type_entities in by_type.items():
            context_parts.append(f"\n{entity_type.title()}s:")
            for entity in type_entities:
                name = entity.get("name", "Unknown")
                desc = entity.get("description", "")
                attrs = entity.get("attributes", {})
                
                context_parts.append(f"- {name}: {desc}")
                if attrs:
                    for key, value in attrs.items():
                        context_parts.append(f"  • {key}: {value}")
        
        return "\n".join(context_parts)