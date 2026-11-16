export const TRACK_DATA = {
    "segments": [
        {
            "id": "seg_1",
            "type": "line",
            "start": {
                "x": 2120,
                "y": 1470
            },
            "end": {
                "x": 2100,
                "y": 2400
            }
        },
        {
            "id": "seg_2",
            "type": "curve",
            "start": {
                "x": 2100,
                "y": 2400
            },
            "control": {
                "x": 2100,
                "y": 2480
            },
            "end": {
                "x": 2200,
                "y": 2470
            }
        },
        {
            "id": "seg_3",
            "type": "line",
            "start": {
                "x": 2200,
                "y": 2470
            },
            "end": {
                "x": 3300,
                "y": 2450
            }
        },
        {
            "id": "seg_4",
            "type": "curve",
            "start": {
                "x": 2120,
                "y": 1470
            },
            "control": {
                "x": 2120,
                "y": 1410
            },
            "end": {
                "x": 2220,
                "y": 1400
            }
        },
        {
            "id": "seg_5",
            "type": "line",
            "start": {
                "x": 2220,
                "y": 1400
            },
            "end": {
                "x": 2550,
                "y": 1400
            }
        }
    ],
    "stations": [
        {
            "id": "st_1",
            "name": "Станция 1",
            "segId": "seg_3",
            "t": 0.53,
            "x": 2778,
            "y": 2460
        },
        {
            "id": "st_2",
            "name": "Станция 2",
            "segId": "seg_1",
            "t": 0.13,
            "x": 2118,
            "y": 1586
        }
    ],
    "switches": []
};
