"""
TMVN (Trusted Mobile Verification Network) Road Graph and Routing Engine.
Builds a realistic multimodal road network for Mumbai-Thane disaster corridors
using NetworkX, supporting dynamic hazard speed penalties, inundated road closures,
and Dijkstra/A* shortest path routing with realistic travel time and distance estimation.
"""

from typing import Dict, List, Tuple, Optional, Any
import networkx as nx
import math
from dataclasses import dataclass, field


@dataclass
class RouteStep:
    from_node: str
    to_node: str
    road_name: str
    distance_meters: float
    travel_time_seconds: float
    is_hazard_affected: bool


@dataclass
class RouteResult:
    total_distance_meters: float
    total_travel_time_seconds: float
    path_nodes: List[str]
    steps: List[RouteStep]
    estimated_arrival_minutes: float
    route_status: str  # 'OPTIMAL', 'DETOUR_DUE_TO_HAZARD', 'UNREACHABLE'


class DisasterCorridorRoadGraph:
    """
    Topological road network connecting Mumbai, Thane, Navi Mumbai, and Kalyan.
    Nodes represent strategic junctions, verifier home hubs, and emergency depots.
    Edges contain road classifications, normal travel speeds (km/h), and dynamic hazard impedances.
    """

    def __init__(self):
        self.graph = nx.DiGraph()
        self._build_corridor_network()

    def _build_corridor_network(self):
        # Key nodes across Mumbai Metropolitan Region (MMR) disaster corridors
        nodes = {
            "MUMBRA_STATION": {"name": "Mumbra Railway Station Junction", "lat": 19.1895, "lon": 73.0245, "type": "hub"},
            "MUMBRA_BYPASS": {"name": "Mumbra Bypass Highway", "lat": 19.1762, "lon": 73.0185, "type": "junction"},
            "RETIBUNDER_CIRCLE": {"name": "Retibunder Circle, Thane", "lat": 19.2012, "lon": 73.0115, "type": "junction"},
            "THANE_STATION_EAST": {"name": "Thane Station East", "lat": 19.1868, "lon": 72.9754, "type": "hub"},
            "MAJHIWADA_FLYOVER": {"name": "Majhiwada Golden Dyes Junction", "lat": 19.2185, "lon": 72.9865, "type": "major_junction"},
            "KURLA_LBS_MARG": {"name": "Kurla LBS Marg Junction", "lat": 19.0685, "lon": 72.8835, "type": "junction"},
            "KURLA_SUBWAY": {"name": "Kurla Subway Underpass", "lat": 19.0652, "lon": 72.8795, "type": "vulnerable_point"},
            "SION_CIRCLE": {"name": "Sion Circle Hub", "lat": 19.0395, "lon": 72.8625, "type": "major_junction"},
            "AIROLI_BRIDGE_TOLL": {"name": "Airoli Bridge Creek Toll", "lat": 19.1555, "lon": 72.9815, "type": "toll_junction"},
            "AIROLI_SECTOR_8": {"name": "Airoli Knowledge Park Sector 8", "lat": 19.1598, "lon": 72.9985, "type": "hub"},
            "SHILPHATA_JUNCTION": {"name": "Shilphata Mahape Junction", "lat": 19.1415, "lon": 73.0452, "type": "major_junction"},
            "KALYAN_APMC": {"name": "Kalyan APMC Market", "lat": 19.2385, "lon": 73.1285, "type": "hub"},
            "DOMBIVLI_MIDC": {"name": "Dombivli MIDC Phase II", "lat": 19.2152, "lon": 73.0915, "type": "industrial_hub"},
            "BHIWANDI_BYPASS": {"name": "Bhiwandi Bypass Highway", "lat": 19.2785, "lon": 73.0565, "type": "high_capacity"},
        }

        for node_id, data in nodes.items():
            self.graph.add_node(node_id, **data)

        # Interconnecting edges: (u, v, road_name, distance_meters, base_speed_kmh)
        corridors = [
            ("MUMBRA_STATION", "MUMBRA_BYPASS", "Old Mumbai-Pune Road", 2400, 40),
            ("MUMBRA_BYPASS", "MUMBRA_STATION", "Old Mumbai-Pune Road", 2400, 40),
            ("MUMBRA_STATION", "RETIBUNDER_CIRCLE", "Mumbra Creek Link", 1800, 35),
            ("RETIBUNDER_CIRCLE", "MUMBRA_STATION", "Mumbra Creek Link", 1800, 35),
            ("RETIBUNDER_CIRCLE", "THANE_STATION_EAST", "Kalwa Bridge Route", 3200, 45),
            ("THANE_STATION_EAST", "RETIBUNDER_CIRCLE", "Kalwa Bridge Route", 3200, 45),
            ("THANE_STATION_EAST", "MAJHIWADA_FLYOVER", "Ghodbunder Connecting Road", 3800, 50),
            ("MAJHIWADA_FLYOVER", "THANE_STATION_EAST", "Ghodbunder Connecting Road", 3800, 50),
            ("MUMBRA_BYPASS", "SHILPHATA_JUNCTION", "Shilphata Express Arterial", 4500, 60),
            ("SHILPHATA_JUNCTION", "MUMBRA_BYPASS", "Shilphata Express Arterial", 4500, 60),
            ("SHILPHATA_JUNCTION", "AIROLI_SECTOR_8", "Thane-Belapur Road", 4100, 55),
            ("AIROLI_SECTOR_8", "SHILPHATA_JUNCTION", "Thane-Belapur Road", 4100, 55),
            ("AIROLI_SECTOR_8", "AIROLI_BRIDGE_TOLL", "Airoli Palm Beach Link", 2200, 45),
            ("AIROLI_BRIDGE_TOLL", "AIROLI_SECTOR_8", "Airoli Palm Beach Link", 2200, 45),
            ("AIROLI_BRIDGE_TOLL", "MAJHIWADA_FLYOVER", "Eastern Express Highway Connector", 6200, 65),
            ("MAJHIWADA_FLYOVER", "AIROLI_BRIDGE_TOLL", "Eastern Express Highway Connector", 6200, 65),
            ("KURLA_LBS_MARG", "KURLA_SUBWAY", "Kurla West Underpass Link", 950, 25),
            ("KURLA_SUBWAY", "KURLA_LBS_MARG", "Kurla West Underpass Link", 950, 25),
            ("KURLA_LBS_MARG", "SION_CIRCLE", "LBS Marg Arterial", 2800, 35),
            ("SION_CIRCLE", "KURLA_LBS_MARG", "LBS Marg Arterial", 2800, 35),
            ("SION_CIRCLE", "AIROLI_BRIDGE_TOLL", "Eastern Freeway / Express Link", 7800, 70),
            ("AIROLI_BRIDGE_TOLL", "SION_CIRCLE", "Eastern Freeway / Express Link", 7800, 70),
            ("SHILPHATA_JUNCTION", "DOMBIVLI_MIDC", "Kalyan-Shil Road", 5100, 45),
            ("DOMBIVLI_MIDC", "SHILPHATA_JUNCTION", "Kalyan-Shil Road", 5100, 45),
            ("DOMBIVLI_MIDC", "KALYAN_APMC", "Patri Pool Highway", 4200, 40),
            ("KALYAN_APMC", "DOMBIVLI_MIDC", "Patri Pool Highway", 4200, 40),
            ("MAJHIWADA_FLYOVER", "BHIWANDI_BYPASS", "Nashik Highway NH-160", 7200, 65),
            ("BHIWANDI_BYPASS", "MAJHIWADA_FLYOVER", "Nashik Highway NH-160", 7200, 65),
            ("BHIWANDI_BYPASS", "KALYAN_APMC", "Kalyan-Bhiwandi Road", 6800, 50),
            ("KALYAN_APMC", "BHIWANDI_BYPASS", "Kalyan-Bhiwandi Road", 6800, 50),
        ]

        for u, v, name, dist, speed in corridors:
            # base travel time in seconds: distance / (speed_kmh * 1000 / 3600)
            base_time = dist / (speed * 1000.0 / 3600.0)
            self.graph.add_edge(
                u, v,
                road_name=name,
                distance_meters=dist,
                base_speed_kmh=speed,
                travel_time_seconds=base_time,
                is_closed=False,
                hazard_factor=1.0  # multiplier: 1.0 = clear, >1.0 = congested/delayed, inf = closed
            )

    def set_hazard_impedance(self, u: str, v: str, hazard_factor: float, is_closed: bool = False):
        """
        Dynamically adjusts travel time weight or completely closes an edge due to floodwater or fire.
        """
        if self.graph.has_edge(u, v):
            edge = self.graph[u][v]
            edge["hazard_factor"] = hazard_factor
            edge["is_closed"] = is_closed
            if is_closed:
                edge["effective_weight"] = float("inf")
            else:
                edge["effective_weight"] = edge["travel_time_seconds"] * hazard_factor

    def reset_impedances(self):
        """Resets all roads to nominal conditions."""
        for u, v, d in self.graph.edges(data=True):
            d["hazard_factor"] = 1.0
            d["is_closed"] = False
            d["effective_weight"] = d["travel_time_seconds"]

    def calculate_route(self, origin_node: str, destination_node: str) -> RouteResult:
        """
        Calculates shortest travel time route taking dynamic disaster impedances into account.
        """
        if origin_node not in self.graph or destination_node not in self.graph:
            return RouteResult(
                total_distance_meters=0.0,
                total_travel_time_seconds=0.0,
                path_nodes=[],
                steps=[],
                estimated_arrival_minutes=0.0,
                route_status="UNREACHABLE"
            )

        # Filter out completely closed edges
        def weight_fn(u, v, edge_dict):
            if edge_dict.get("is_closed", False):
                return None
            return edge_dict.get("effective_weight", edge_dict.get("travel_time_seconds", 60.0))

        try:
            path = nx.shortest_path(self.graph, source=origin_node, target=destination_node, weight=weight_fn)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return RouteResult(
                total_distance_meters=0.0,
                total_travel_time_seconds=0.0,
                path_nodes=[],
                steps=[],
                estimated_arrival_minutes=0.0,
                route_status="UNREACHABLE"
            )

        steps: List[RouteStep] = []
        total_dist = 0.0
        total_time = 0.0
        detour_detected = False

        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            edge = self.graph[u][v]
            dist = edge["distance_meters"]
            t_time = edge.get("effective_weight", edge["travel_time_seconds"])
            is_haz = edge.get("hazard_factor", 1.0) > 1.2

            if is_haz:
                detour_detected = True

            total_dist += dist
            total_time += t_time
            steps.append(RouteStep(
                from_node=u,
                to_node=v,
                road_name=edge["road_name"],
                distance_meters=dist,
                travel_time_seconds=t_time,
                is_hazard_affected=is_haz
            ))

        status = "DETOUR_DUE_TO_HAZARD" if detour_detected else "OPTIMAL"

        return RouteResult(
            total_distance_meters=round(total_dist, 1),
            total_travel_time_seconds=round(total_time, 1),
            path_nodes=path,
            steps=steps,
            estimated_arrival_minutes=round(total_time / 60.0, 1),
            route_status=status
        )

    def get_closest_node(self, lat: float, lon: float) -> str:
        """Finds closest node in road network using Euclidean/Haversine approximation."""
        best_node = None
        min_dist = float("inf")
        for node, data in self.graph.nodes(data=True):
            dlat = data["lat"] - lat
            dlon = data["lon"] - lon
            dist = math.sqrt(dlat * dlat + dlon * dlon)
            if dist < min_dist:
                min_dist = dist
                best_node = node
        return best_node or "MUMBRA_STATION"
