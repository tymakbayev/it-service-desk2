from marshmallow import Schema, fields

class IncidentSchema(Schema):
    id = fields.Int()
    title = fields.Str(required=True)
    description = fields.Str(required=True)

class IncidentUpdateSchema(Schema):
    title = fields.Str()
    description = fields.Str()

class IncidentStatusSchema(Schema):
    status = fields.Str(required=True)

class IncidentAssignSchema(Schema):
    assigned_to_id = fields.Int(required=True)
