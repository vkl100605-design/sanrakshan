"""
Simulated Multi-Agency Dispatch Planner for Sanrakshan Command Center.
Synthesizes multi-agency asset staging (Fire Services, NDRF/SDRF, EMS/Ambulance, Traffic Police,
Municipal Drainage) with station routing, equipment inventories, and strict simulation boundaries.
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone
from src.simulation.tmvn_graph import DisasterCorridorRoadGraph


@dataclass
class EmergencyResource:
    unit_id: str
    agency: str  # 'FIRE_SERVICE', 'NDRF_RESCUE', 'AMBULANCE_EMS', 'TRAFFIC_POLICE', 'MUNICIPAL_DRAINAGE'
    unit_type: str
    origin_station: str
    assigned_node: str
    eta_minutes: float
    distance_meters: float
    status: str  # 'STANDBY', 'STAGED', 'DISPATCHED_SIMULATED'
    equipment: List[str]


@dataclass
class SimulatedDispatchPlan:
    plan_id: str
    incident_id: str
    hazard_type: str
    severity: str
    recommended_resources: List[EmergencyResource]
    evacuation_zone_radius_meters: int
    transit_shelter_assigned: Optional[str]
    total_mobilized_personnel: int
    estimated_arrival_window: str
    simulation_boundary_notice: str
    created_at: str


# Strategic stations across Mumbai/Thane corridors
EMERGENCY_STATIONS = {
    "THANE_FIRE_CENTRAL": {"name": "Thane Central Fire Station (Majhiwada)", "node": "MAJHIWADA_FLYOVER", "agency": "FIRE_SERVICE"},
    "KURLA_FIRE_STATION": {"name": "Kurla Fire Station (LBS Marg)", "node": "KURLA_LBS_MARG", "agency": "FIRE_SERVICE"},
    "KALWA_NDRF_BASE": {"name": "Kalwa NDRF Regional Response Base", "node": "RETIBUNDER_CIRCLE", "agency": "NDRF_RESCUE"},
    "AIROLI_TRAUMA_EMS": {"name": "Airoli Emergency Trauma Hospital", "node": "AIROLI_SECTOR_8", "agency": "AMBULANCE_EMS"},
    "SION_HOSPITAL_EMS": {"name": "Sion Hospital Ambulance Hub", "node": "SION_CIRCLE", "agency": "AMBULANCE_EMS"},
    "MUMBRA_MUNICIPAL_DEPOT": {"name": "Mumbra Ward Drainage Operations Depot", "node": "MUMBRA_STATION", "agency": "MUNICIPAL_DRAINAGE"},
    "THANE_TRAFFIC_HQ": {"name": "Thane Traffic Police Headquarters", "node": "THANE_STATION_EAST", "agency": "TRAFFIC_POLICE"},
}


class MultiAgencyDispatchPlanner:
    def __init__(self, road_graph: Optional[DisasterCorridorRoadGraph] = None):
        self.road_graph = road_graph or DisasterCorridorRoadGraph()

    def generate_dispatch_plan(
        self,
        incident_id: str,
        hazard_type: str,
        target_node: str,
        posterior_confidence: float,
        water_depth_cm: Optional[float] = 0.0
    ) -> SimulatedDispatchPlan:
        """
        Synthesizes a proportionate multi-agency response package based on hazard & severity.
        """
        plan_id = f"plan-{uuid.uuid4().hex[:8]}"
        hazard = hazard_type.upper()

        resources: List[EmergencyResource] = []

        if hazard == "FLOOD":
            severity = "CRITICAL" if (water_depth_cm or 0) > 30.0 or posterior_confidence > 0.80 else "MODERATE"
            evac_radius = 500 if severity == "CRITICAL" else 250
            shelter = "Mumbra Municipal School No. 4 Relief Camp"

            # 1. NDRF Rescue Boats
            ndrf_route = self.road_graph.calculate_route("RETIBUNDER_CIRCLE", target_node)
            resources.append(EmergencyResource(
                unit_id=f"NDRF-BOAT-{uuid.uuid4().hex[:4].upper()}",
                agency="NDRF_RESCUE",
                unit_type="Inflatable Motorized Rescue Boat (Gemini 8-man)",
                origin_station="Kalwa NDRF Regional Response Base",
                assigned_node="RETIBUNDER_CIRCLE",
                eta_minutes=ndrf_route.estimated_arrival_minutes + 5.0,  # 5 min staging
                distance_meters=ndrf_route.total_distance_meters,
                status="STAGED",
                equipment=["8x Life Jackets", "Searchlight 5000lm", "First Aid Trauma Kit", "Outboard Motor 40HP"]
            ))

            # 2. High-Capacity De-Watering Pumps
            pump_route = self.road_graph.calculate_route("MUMBRA_STATION", target_node)
            resources.append(EmergencyResource(
                unit_id=f"DRAIN-PUMP-{uuid.uuid4().hex[:4].upper()}",
                agency="MUNICIPAL_DRAINAGE",
                unit_type="Trailer-Mounted Submersible Pump (500 HP / 2000 LPM)",
                origin_station="Mumbra Ward Drainage Operations Depot",
                assigned_node="MUMBRA_STATION",
                eta_minutes=pump_route.estimated_arrival_minutes + 7.0,
                distance_meters=pump_route.total_distance_meters,
                status="STAGED",
                equipment=["400m Flexible Discharge Hose", "Diesel Generator 80 kVA", "Trash Strainer Basket"]
            ))

            # 3. Waterborne Emergency Medical Van
            ems_route = self.road_graph.calculate_route("AIROLI_SECTOR_8", target_node)
            resources.append(EmergencyResource(
                unit_id=f"EMS-ALS-{uuid.uuid4().hex[:4].upper()}",
                agency="AMBULANCE_EMS",
                unit_type="Advanced Life Support Mobile ICU (High-Clearance 4x4)",
                origin_station="Airoli Emergency Trauma Hospital",
                assigned_node="AIROLI_SECTOR_8",
                eta_minutes=ems_route.estimated_arrival_minutes + 3.0,
                distance_meters=ems_route.total_distance_meters,
                status="STAGED",
                equipment=["Ventilator", "Defibrillator", "Hypothermia Warming Blankets", "Oxygen Concentrator"]
            ))

            # 4. Traffic Police Perimeter Diversion
            police_route = self.road_graph.calculate_route("THANE_STATION_EAST", target_node)
            resources.append(EmergencyResource(
                unit_id=f"POLICE-DIV-{uuid.uuid4().hex[:4].upper()}",
                agency="TRAFFIC_POLICE",
                unit_type="Traffic Diversion Patrol Unit",
                origin_station="Thane Traffic Police Headquarters",
                assigned_node="THANE_STATION_EAST",
                eta_minutes=police_route.estimated_arrival_minutes + 2.0,
                distance_meters=police_route.total_distance_meters,
                status="STAGED",
                equipment=["Waterproof Barricades", "Reflective Strobe Cones", "Public Address Megaphone"]
            ))

            personnel = 26

        elif hazard == "FIRE":
            severity = "CRITICAL" if posterior_confidence > 0.85 else "MODERATE"
            evac_radius = 800 if severity == "CRITICAL" else 400
            shelter = "Airoli Sports Complex Safe Transit Zone"

            # 1. Fire Fighting Water Tenders
            fire_route = self.road_graph.calculate_route("MAJHIWADA_FLYOVER", target_node)
            resources.append(EmergencyResource(
                unit_id=f"FIRE-TDR-{uuid.uuid4().hex[:4].upper()}",
                agency="FIRE_SERVICE",
                unit_type="Multi-Hazard Water Tender (4500 Liters + High-Pressure Monitor)",
                origin_station="Thane Central Fire Station (Majhiwada)",
                assigned_node="MAJHIWADA_FLYOVER",
                eta_minutes=fire_route.estimated_arrival_minutes + 4.0,
                distance_meters=fire_route.total_distance_meters,
                status="STAGED",
                equipment=["Breathing Apparatus sets (SCBA)", "Thermal Imaging Camera", "Foam Inductor System", "Hydraulic Cutters"]
            ))

            # 2. Foam Crash Tender for Chemical/Industrial scrub
            resources.append(EmergencyResource(
                unit_id=f"FIRE-FOAM-{uuid.uuid4().hex[:4].upper()}",
                agency="FIRE_SERVICE",
                unit_type="Heavy Foam Tender (2000L AFFF)",
                origin_station="Thane Central Fire Station (Majhiwada)",
                assigned_node="MAJHIWADA_FLYOVER",
                eta_minutes=fire_route.estimated_arrival_minutes + 6.0,
                distance_meters=fire_route.total_distance_meters,
                status="STAGED",
                equipment=["AFFF Foam Concentrate", "Dry Chemical Powder System (500kg)", "Master Stream Deluge Nozzle"]
            ))

            # 3. Burn Trauma Ambulance
            ems_route = self.road_graph.calculate_route("AIROLI_SECTOR_8", target_node)
            resources.append(EmergencyResource(
                unit_id=f"EMS-BURN-{uuid.uuid4().hex[:4].upper()}",
                agency="AMBULANCE_EMS",
                unit_type="Specialized Burn & Smoke Inhalation Mobile Unit",
                origin_station="Airoli Emergency Trauma Hospital",
                assigned_node="AIROLI_SECTOR_8",
                eta_minutes=ems_route.estimated_arrival_minutes + 3.0,
                distance_meters=ems_route.total_distance_meters,
                status="STAGED",
                equipment=["Sterile Burn Sheets", "High-Flow Oxygen Reservoirs", "Cyanide Poisoning Antidote Kit", "IV Infusion Warmers"]
            ))

            # 4. Traffic Corridor Clearance
            police_route = self.road_graph.calculate_route("AIROLI_BRIDGE_TOLL", target_node)
            resources.append(EmergencyResource(
                unit_id=f"POLICE-CORR-{uuid.uuid4().hex[:4].upper()}",
                agency="TRAFFIC_POLICE",
                unit_type="Green Corridor Road Clearance Patrol",
                origin_station="Airoli Toll Traffic Beat",
                assigned_node="AIROLI_BRIDGE_TOLL",
                eta_minutes=police_route.estimated_arrival_minutes + 2.0,
                distance_meters=police_route.total_distance_meters,
                status="STAGED",
                equipment=["Highway Flashing Beacons", "Emergency Siren System", "Traffic Halt Signal Controls"]
            ))

            personnel = 34

        else:
            severity = "MODERATE"
            evac_radius = 200
            shelter = "Local Community Ward Hall"
            personnel = 12

        # Compute arrival window
        etas = [r.eta_minutes for r in resources]
        min_eta = round(min(etas), 1) if etas else 5.0
        max_eta = round(max(etas), 1) if etas else 15.0

        return SimulatedDispatchPlan(
            plan_id=plan_id,
            incident_id=incident_id,
            hazard_type=hazard,
            severity=severity,
            recommended_resources=resources,
            evacuation_zone_radius_meters=evac_radius,
            transit_shelter_assigned=shelter,
            total_mobilized_personnel=personnel,
            estimated_arrival_window=f"{min_eta} - {max_eta} minutes",
            simulation_boundary_notice="STRICT ACADEMIC SIMULATION: Units are staged in simulation telemetry only. Zero external emergency APIs invoked.",
            created_at=datetime.now(timezone.utc).isoformat()
        )
