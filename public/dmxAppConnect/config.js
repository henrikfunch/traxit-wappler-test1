dmx.config({
  "main": {
    "query": [
      {
        "type": "text",
        "name": "sort"
      },
      {
        "type": "text",
        "name": "dir"
      }
    ]
  },
  "Storages": {
    "cookies": [
      {
        "type": "text",
        "name": "email"
      }
    ],
    "sessionStorage": [
      {
        "type": "text",
        "name": "email"
      }
    ],
    "localStorage": [
      {
        "type": "text",
        "name": "email"
      }
    ]
  },
  "cars_list": {
    "query": [
      {
        "type": "text",
        "name": "sort"
      },
      {
        "type": "text",
        "name": "dir"
      }
    ],
    "sessionStorage": [
      {
        "type": "number",
        "name": "selected_car_id"
      }
    ]
  },
  "entreprises": {
    "sessionStorage": [
      {
        "type": "number",
        "name": "Entreprises"
      }
    ],
    "tableRepeat3": {
      "meta": [],
      "outputType": "object"
    },
    "repeat1": {
      "meta": [],
      "outputType": "object"
    },
    "query": [
      {
        "type": "text",
        "name": "sort"
      },
      {
        "type": "text",
        "name": "dir"
      }
    ],
    "get_entreprises": {
      "meta": [],
      "outputType": "object"
    }
  }
});
