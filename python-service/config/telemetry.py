import os
import logging
from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.django import DjangoInstrumentor

def setup_telemetry():
    if os.environ.get("ENABLE_TELEMETRY", "False").lower() in ("true", "1", "yes"):
        resource = Resource(attributes={"service.name": "python-api"})
        trace.set_tracer_provider(TracerProvider(resource=resource))
        tracer_provider = trace.get_tracer_provider()
        
        otlp_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://jaeger:4318/v1/traces")
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider.add_span_processor(span_processor)
        
        # Also log to console if in debug mode
        if os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes"):
            tracer_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
            
        DjangoInstrumentor().instrument()
        logging.info("OpenTelemetry initialization complete")
