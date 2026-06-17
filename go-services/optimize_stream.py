import os

file_path = 'e:/java/go-services/stream-service/internal/service/stream.go'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_list_streams = '''// ListLiveStreams returns all currently live streams.
func (s *StreamService) ListLiveStreams(ctx context.Context) ([]*model.Stream, error) {
	streamIDs, err := s.redis.SMembers(ctx, "streams:live").Result()
	if err != nil {
		return nil, err
	}

	var streams []*model.Stream
	for _, id := range streamIDs {
		stream, err := s.GetStream(ctx, id)
		if err == nil {
			// Don't expose stream key to viewers
			stream.StreamKey = ""
			streams = append(streams, stream)
		}
	}

	if streams == nil {
		streams = []*model.Stream{}
	}
	return streams, nil
}'''

new_list_streams = '''// ListLiveStreams returns all currently live streams (Optimized with Redis Pipeline).
func (s *StreamService) ListLiveStreams(ctx context.Context) ([]*model.Stream, error) {
	dbCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	streamIDs, err := s.redis.SMembers(dbCtx, "streams:live").Result()
	if err != nil {
		return nil, err
	}
	if len(streamIDs) == 0 {
		return []*model.Stream{}, nil
	}

	pipe := s.redis.Pipeline()
	var metadataCmds []*redis.StringCmd
	var viewerCmds []*redis.StringCmd

	for _, id := range streamIDs {
		metadataCmds = append(metadataCmds, pipe.Get(dbCtx, fmt.Sprintf("stream:%s", id)))
		viewerCmds = append(viewerCmds, pipe.Get(dbCtx, fmt.Sprintf("stream:%s:viewers", id)))
	}

	// Eksekusi semua command dalam 1 network roundtrip
	_, _ = pipe.Exec(dbCtx)

	var streams []*model.Stream
	for i := range streamIDs {
		data, err := metadataCmds[i].Result()
		if err != nil {
			continue // skip broken stream
		}
		
		var stream model.Stream
		if err := json.Unmarshal([]byte(data), &stream); err == nil {
			count, _ := viewerCmds[i].Int()
			stream.ViewerCount = count
			stream.StreamKey = "" // Jangan expose stream key ke publik
			streams = append(streams, &stream)
		}
	}

	if streams == nil {
		streams = []*model.Stream{}
	}
	return streams, nil
}'''

content = content.replace(old_list_streams, new_list_streams)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Optimized ListLiveStreams using Redis Pipeline")
